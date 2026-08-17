import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import {
  useSceneStore,
  SYSTEM_FONTS,
  type SceneNode,
  type BitmapNode,
  type TimeNode,
  type ImageTimeNode,
  type GPathNode,
  type TextNode,
  type CustomFont,
  type ProjectFile,
  type ProjectSceneNode,
} from '../store/scene'
import { randomUuid } from '../lib/utils'
import {
  usesSegmentedImageTime,
  imageTimeGlyphKeys,
  imageTimeFormatExpression,
  needsUppercaseImageTime,
  buildImageTimePositions,
  imageTimeCharCount,
} from '../lib/image-time'
import {
  buildCustomFontCharacterCoverage,
  characterRegexForCoverage,
  customFontUsageKey,
} from '../lib/font-filter'

type PebbleResource = {
  type: string
  name: string
  file: string
}

type PebbleFontResource = {
  type: 'font'
  name: string
  file: string
  compatibility: string
  characterRegex?: string
}

const dataUrlToUint8 = async (dataUrl: string) => {
  const res = await fetch(dataUrl)
  const buf = await res.arrayBuffer()
  return new Uint8Array(buf)
}

export async function generatePebbleProjectZip(nodes: SceneNode[], projectName: string) {
  const store = useSceneStore.getState()
  const targetPlatforms = store.targetPlatforms
  const customFonts = store.customFonts

  const zip = new JSZip()
  const media: PebbleResource[] = []
  const fonts: PebbleFontResource[] = []

  const src = zip.folder('src')
  const res = zip.folder('resources')?.folder('images')
  const fontRes = zip.folder('resources')?.folder('fonts')

  // Identify used custom fonts and add them to resources
  const usedCustomFonts = new Set<string>()
  const textNodes = nodes.filter((n) => n.type === 'text' || n.type === 'time') as (TextNode | TimeNode)[]
  const customFontCoverage = buildCustomFontCharacterCoverage(nodes)

  for (const node of textNodes) {
    if (node.customFontId) {
      const fontDef = customFonts.find((f) => f.id === node.customFontId)
      if (fontDef) {
        usedCustomFonts.add(node.customFontId)

        // Nodes sharing a custom font and size use one resource containing the
        // union of every filter used by that group.
        const resourceName = `FONT_${sanitizeResourceName(fontDef.name)}_${node.fontSize}`
        // Check if already added
        if (!fonts.find((f) => f.name === resourceName)) {
          fonts.push({
            type: 'font',
            name: resourceName,
            file: `fonts/${fontDef.file?.name || fontDef.name + '.ttf'}`,
            compatibility: '2.7', // Standard
            characterRegex: characterRegexForCoverage(customFontCoverage.get(customFontUsageKey(node)!)),
          })
        }
      }
    }
  }

  // Write font files
  for (const fontId of usedCustomFonts) {
    const fontDef = customFonts.find((f) => f.id === fontId)
    if (fontDef && fontRes) {
      if (fontDef.file) {
        const buf = await fontDef.file.arrayBuffer()
        fontRes.file(fontDef.file.name, buf)
      } else {
        // Handle imported fonts without File object (only dataUrl)
        const data = await dataUrlToUint8(fontDef.dataUrl)
        fontRes.file(`${fontDef.name}.ttf`, data)
      }
    }
  }

  const bitmapNodes = nodes.filter((n) => n.type === 'bitmap') as BitmapNode[]
  const imageTimeNodes = nodes.filter((n) => n.type === 'image-time') as ImageTimeNode[]
  for (const bmp of bitmapNodes) {
    const baseName = sanitizeFileName(bmp.fileName ? bmp.fileName.replace(/\.[^/.]+$/, '') : bmp.name)
    const fileName = `${baseName}.png`
    const filePath = `images/${fileName}`
    const resourceName = sanitizeResourceName(bmp.name)
    media.push({ type: 'png', name: resourceName, file: filePath })

    if (res) {
      let pngData: Uint8Array
      if (bmp.file && bmp.file.type === 'image/png') {
        const buf = await bmp.file.arrayBuffer()
        pngData = new Uint8Array(buf)
      } else if (bmp.dataUrl.startsWith('data:image/png')) {
        pngData = await dataUrlToUint8(bmp.dataUrl)
      } else {
        const blob = await imageToPngBlob(bmp.dataUrl)
        pngData = new Uint8Array(await blob.arrayBuffer())
      }
      res.file(fileName, pngData)
    }
  }

  for (const [nodeIndex, node] of imageTimeNodes.entries()) {
    for (const asset of node.glyphs) {
      const baseName = asset.fileName ? asset.fileName.replace(/\.[^/.]+$/, '') : `${node.name}-${asset.key}`
      const fileName = `${sanitizeFileName(`${baseName}-${nodeIndex}-${asset.key}`)}.png`
      const filePath = `images/${fileName}`
      const resourceName = sanitizeResourceName(`${node.name}_${nodeIndex}_${asset.key}`)
      media.push({ type: 'png', name: resourceName, file: filePath })

      if (res) {
        let pngData: Uint8Array
        const layout = buildImageTimeLayout(node)
        const digitWidth = Math.max(4, Math.round(layout.charWidth))
        const digitHeight = Math.max(4, Math.round(node.height))
        if (asset.dataUrl.startsWith('data:image/png')) {
          const fittedBlob = await imageToContainedPngBlob(asset.dataUrl, digitWidth, digitHeight)
          pngData = new Uint8Array(await fittedBlob.arrayBuffer())
        } else {
          const blob = await imageToContainedPngBlob(asset.dataUrl, digitWidth, digitHeight)
          pngData = new Uint8Array(await blob.arrayBuffer())
        }
        res.file(fileName, pngData)
      }
    }
  }

  src?.file('main.c', templateMainC(nodes, customFonts))
  zip.file('package.json', JSON.stringify(templatePebblePackage(projectName, media, fonts, targetPlatforms), null, 2))
  zip.file('wscript', templateWscript)

  const blob = await zip.generateAsync({ type: 'blob' })
  return { blob, fileName: `${projectName}.zip` }
}

export async function exportPebbleProject(nodes: SceneNode[], projectName: string) {
  const { blob, fileName } = await generatePebbleProjectZip(nodes, projectName)
  saveAs(blob, fileName)
}

const serializeProjectNode = (node: SceneNode): ProjectSceneNode => {
  if (node.type === 'bitmap') {
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      locked: Boolean(node.locked),
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      rotation: node.rotation,
      stroke: node.stroke,
      strokeWidth: node.strokeWidth,
      dataUrl: node.dataUrl,
      fileName: node.fileName,
    }
  }
  if (node.type === 'image-time') {
    return {
      ...node,
      locked: Boolean(node.locked),
      glyphs: node.glyphs.map(({ key, dataUrl, fileName }) => ({ key, dataUrl, fileName })),
    }
  }
  return { ...node, locked: Boolean(node.locked) }
}

export function saveProjectFile() {
  const store = useSceneStore.getState()

  const project: ProjectFile = {
    fileType: 'pebble-face-studio-project',
    version: 1,
    timestamp: Date.now(),
    meta: {
      name: store.projectName,
      uuid: store.projectUuid,
      targetPlatforms: store.targetPlatforms,
      dimensions: store.stage,
      backgroundColor: store.backgroundColor,
    },
    resources: {
      fonts: store.customFonts.map(({ id, name, dataUrl }) => ({ id, name, dataUrl })),
    },
    scene: store.nodes.map(serializeProjectNode),
  }

  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  saveAs(blob, `${store.projectName || 'project'}.pfs`)
}

const templatePebblePackage = (projectName: string, resources: PebbleResource[], fonts: PebbleFontResource[], platforms: string[]) => {
  const store = useSceneStore.getState()
  return {
    name: slugify(projectName),
    author: 'Pebble Studio',
    version: '1.0.0',
    keywords: ['pebble-app'],
    private: true,
    dependencies: {},
    pebble: {
      displayName: projectName,
      uuid: store.projectUuid || randomUuid(),
      sdkVersion: '3',
      enableMultiJS: true,
      targetPlatforms: platforms,
      watchapp: { watchface: true },
      messageKeys: ['dummy'],
      resources: {
        media: [...resources.map((r) => ({ ...r, type: 'bitmap' })), ...fonts],
      },
    },
  }
}

const templateWscript = `#
# Pebble default waf script
#
import os.path

top = '.'
out = 'build'


def options(ctx):
    ctx.load('pebble_sdk')


def configure(ctx):
    ctx.load('pebble_sdk')


def build(ctx):
    ctx.load('pebble_sdk')

    build_worker = os.path.exists('worker_src')
    binaries = []

    cached_env = ctx.env
    for platform in ctx.env.TARGET_PLATFORMS:
        ctx.env = ctx.all_envs[platform]
        ctx.set_group(ctx.env.PLATFORM_NAME)
        app_elf = '{}/pebble-app.elf'.format(ctx.env.BUILD_DIR)
        ctx.pbl_build(source=ctx.path.ant_glob('src/**/*.c'), target=app_elf, bin_type='app')

        if build_worker:
            worker_elf = '{}/pebble-worker.elf'.format(ctx.env.BUILD_DIR)
            binaries.append({'platform': platform, 'app_elf': app_elf, 'worker_elf': worker_elf})
            ctx.pbl_build(source=ctx.path.ant_glob('worker_src/c/**/*.c'),
                          target=worker_elf,
                          bin_type='worker')
        else:
            binaries.append({'platform': platform, 'app_elf': app_elf})
    ctx.env = cached_env

    ctx.set_group('bundle')
    ctx.pbl_bundle(binaries=binaries,
                   js=ctx.path.ant_glob(['src/pkjs/**/*.js',
                                         'src/pkjs/**/*.json',
                                         'src/common/**/*.js']),
                   js_entry_file='src/pkjs/index.js')
`

const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'pebble-app'

const templateMainC = (nodes: SceneNode[], customFonts: CustomFont[]) => {
  const store = useSceneStore.getState()
  const backgroundColorHex = toHexInt(store.backgroundColor || '#000000')
  const designWidth = Math.max(1, Math.round(store.stage.width || 144))
  const designHeight = Math.max(1, Math.round(store.stage.height || 168))
  const texts = nodes.filter((n) => n.type === 'text')
  const times = nodes.filter((n) => n.type === 'time') as TimeNode[]
  const bitmaps = nodes.filter((n) => n.type === 'bitmap') as BitmapNode[]
  const imageTimes = nodes.filter((n) => n.type === 'image-time') as ImageTimeNode[]
  const gpaths = nodes.filter((n) => n.type === 'gpath') as GPathNode[]

  // Determine if we need time updates and at what frequency
  let tickUnit = ''
  if (times.length > 0 || imageTimes.length > 0) {
    const hasSeconds = times.some((t) => {
      const fmtStr =
        t.format === 'custom' ? convertCustomFormatToStrftime(t.customFormat || '', t.text) : strftimeForFormat(t.format, t.text)
      return fmtStr.includes('%S')
    })
    tickUnit = hasSeconds ? 'SECOND_UNIT' : 'MINUTE_UNIT'
  }

  const bitmapResIds = bitmaps.map((b) => `RESOURCE_ID_${sanitizeResourceName(b.name)}`)
  const imageTimeDecls = imageTimes
    .map((node, idx) => {
      const keys = imageTimeGlyphKeys(node)
      const resIds = keys
        .map((key) => {
          const hasAsset = node.glyphs.some((asset) => asset.key === key)
          return hasAsset ? `RESOURCE_ID_${sanitizeResourceName(`${node.name}_${idx}_${key}`)}` : '0'
        })
        .join(', ')
      const keyDecl = usesSegmentedImageTime(node)
        ? `static const char s_image_time_keys_${idx}[${keys.length}] = { ${keys.map((key) => `'${escapeCChar(key)}'`).join(', ')} };`
        : `static const char *s_image_time_keys_${idx}[${keys.length}] = { ${keys.map((key) => `"${escapeCString(key)}"`).join(', ')} };`
      return `
static GBitmap *s_image_time_bitmaps_${idx}[${keys.length}];
static const uint32_t s_image_time_res_ids_${idx}[${keys.length}] = { ${resIds} };
${keyDecl}`
    })
    .join('\n')

  const timeFormats = times
    .map((t, idx) => {
      const fmtStr =
        t.format === 'custom' ? convertCustomFormatToStrftime(t.customFormat || '', t.text) : strftimeForFormat(t.format, t.text)
      return `static const char *s_time_fmt_${idx} = "${fmtStr}";`
    })
    .join('\n')

  const bitmapDecls =
    bitmaps.length > 0
      ? `
static GBitmap *s_bitmaps[${bitmaps.length}];
static const uint32_t s_bitmap_res_ids[${bitmaps.length}] = { ${bitmapResIds.join(', ')} };`
      : ''

  const usedCustomFontKeys = new Set<string>()
  const customFontDecls: string[] = []
  const customFontLoads: string[] = []
  const customFontUnloads: string[] = []

  const getCustomFontVarName = (n: TextNode | TimeNode) => {
    if (!n.customFontId) return null
    const fontDef = customFonts.find((f) => f.id === n.customFontId)
    if (!fontDef) return null
    return `s_font_${sanitizeResourceName(fontDef.name)}_${n.fontSize}`
  }

  const getCustomFontResourceId = (n: TextNode | TimeNode) => {
    if (!n.customFontId) return null
    const fontDef = customFonts.find((f) => f.id === n.customFontId)
    if (!fontDef) return null
    return `RESOURCE_ID_FONT_${sanitizeResourceName(fontDef.name)}_${n.fontSize}`
  }

  const allTextNodes = [...texts, ...times] as (TextNode | TimeNode)[]

  allTextNodes.forEach((n) => {
    if (n.customFontId) {
      const varName = getCustomFontVarName(n)
      if (varName && !usedCustomFontKeys.has(varName)) {
        usedCustomFontKeys.add(varName)
        customFontDecls.push(`static GFont ${varName};`)
        customFontLoads.push(`  ${varName} = fonts_load_custom_font(resource_get_handle(${getCustomFontResourceId(n)}));`)
        customFontUnloads.push(`  fonts_unload_custom_font(${varName});`)
      }
    }
  })

  const gpathPointArrays = gpaths
    .filter((n) => n.points.length > 1)
    .map((n, idx) => {
      const points = n.points.map((p) => `  { ${round(p.x)}, ${round(p.y)} }`).join(',\n')
      return `
static GPoint s_gpath_points_${idx}[] = {
${points}
};

static GPathInfo s_gpath_info_${idx} = {
  .num_points = ${n.points.length},
  .points = s_gpath_points_${idx},
};

static GPath *s_gpath_${idx};`
    })
    .join('\n')

  const drawableGPaths = gpaths.filter((n) => n.points.length > 1)

  const mappedRect = (n: Pick<SceneNode, 'x' | 'y' | 'width' | 'height'>) =>
    `mapped_rect(${round(n.x)}, ${round(n.y)}, ${round(n.width)}, ${round(n.height)}, bounds)`
  const mappedX = (x: number, width: number) => `map_x(${round(x)}, ${round(width)}, bounds)`
  const mappedY = (y: number, height: number) => `map_y(${round(y)}, ${round(height)}, bounds)`

  const drawAllLayers = nodes
    .map((n) => {
      if (n.type === 'rect') {
        const fillHex = toHexInt(n.fill || '#000000')
        const strokeHex = toHexInt(n.stroke || '#000000')
        return `
  // ${n.name.replace(/[\r\n]/g, ' ')}
  graphics_context_set_fill_color(ctx, color_hex(0x${fillHex.toString(16).padStart(6, '0')}));
  graphics_fill_rect(ctx, ${mappedRect(n)}, 0, GCornerNone);
  graphics_context_set_stroke_color(ctx, color_hex(0x${strokeHex.toString(16).padStart(6, '0')}));
  graphics_context_set_stroke_width(ctx, ${Math.max(1, n.strokeWidth || 1)});
  graphics_draw_rect(ctx, ${mappedRect(n)});`
      }

      if (n.type === 'bitmap') {
        const idx = bitmaps.indexOf(n)
        return `
  // ${n.name.replace(/[\r\n]/g, ' ')}
  if (s_bitmaps[${idx}]) {
    graphics_draw_bitmap_in_rect(ctx, s_bitmaps[${idx}], ${mappedRect(n)});
  }`
      }

      if (n.type === 'image-time') {
        const idx = imageTimes.indexOf(n)
        const value = imageTimeFormatExpression(n)
        const layout = buildImageTimeLayout(n)
        const xPositions = layout.positions.map((x) => `base_x_${idx} + ${round(x)}`).join(', ')
        const formatLabel =
          n.mode === 'time'
            ? n.timeFormat
            : n.mode === 'date'
              ? n.dateFormat
              : n.weekFormat
        return `
  // ${n.name.replace(/[\r\n]/g, ' ')}
  // mode: ${n.mode}, format: ${formatLabel}, strftime: ${value}
  {
    char image_time_value_${idx}[8];
    time_t now_${idx} = time(NULL);
    struct tm *tick_${idx} = localtime(&now_${idx});
    strftime(image_time_value_${idx}, sizeof(image_time_value_${idx}), "${value}", tick_${idx});
    ${needsUppercaseImageTime(n) ? `
    for (int i = 0; image_time_value_${idx}[i] != '\\0'; i++) {
      if (image_time_value_${idx}[i] >= 'a' && image_time_value_${idx}[i] <= 'z') {
        image_time_value_${idx}[i] = image_time_value_${idx}[i] - 'a' + 'A';
      }
    }` : ''}
    const int char_w_${idx} = ${Math.max(4, round(layout.charWidth))};
    const int char_h_${idx} = ${Math.max(4, round(n.height))};
    const int base_x_${idx} = ${mappedX(n.x, n.width)};
    const int base_y_${idx} = ${mappedY(n.y, n.height)};
    ${layout.positions.length > 1 ? `
    const int x_positions_${idx}[${layout.positions.length}] = {
      ${xPositions}
    };
    for (int i = 0; i < ${layout.positions.length}; i++) {
      char glyph_key = image_time_value_${idx}[i];
      for (int j = 0; j < ${imageTimeGlyphKeys(n).length}; j++) {
        if (s_image_time_keys_${idx}[j] != glyph_key) continue;
        if (s_image_time_bitmaps_${idx}[j]) {
          graphics_draw_bitmap_in_rect(ctx, s_image_time_bitmaps_${idx}[j],
                                       GRect(x_positions_${idx}[i], base_y_${idx}, char_w_${idx}, char_h_${idx}));
        }
        break;
      }
    }` : `
    for (int j = 0; j < ${imageTimeGlyphKeys(n).length}; j++) {
      if (strcmp(image_time_value_${idx}, s_image_time_keys_${idx}[j]) != 0) continue;
      if (s_image_time_bitmaps_${idx}[j]) {
        graphics_draw_bitmap_in_rect(ctx, s_image_time_bitmaps_${idx}[j],
                                     GRect(base_x_${idx}, base_y_${idx}, char_w_${idx}, char_h_${idx}));
      }
      break;
    }`}
  }`
      }

      if (n.type === 'gpath' && n.points.length > 1) {
        const idx = drawableGPaths.indexOf(n)
        const strokeHex = toHexInt(n.stroke || '#ffffff')
        return `
  // ${n.name.replace(/[\r\n]/g, ' ')}
  graphics_context_set_stroke_color(ctx, color_hex(0x${strokeHex.toString(16).padStart(6, '0')}));
  graphics_context_set_stroke_width(ctx, ${Math.max(1, Math.round(n.strokeWidth || 1))});
  if (s_gpath_${idx}) {
    gpath_move_to(s_gpath_${idx}, GPoint(${mappedX(n.x, n.width)}, ${mappedY(n.y, n.height)}));
    gpath_draw_outline(ctx, s_gpath_${idx});
  }`
      }

      if (n.type === 'text') {
        const fillHex = toHexInt(n.fill || '#ffffff')
        const fontExpr = n.customFontId
          ? getCustomFontVarName(n)
          : `font_for("${escapeText(n.fontFamily || '')}", ${Math.round(n.fontSize || 14)}, ${n.bold ? 'true' : 'false'})`

        return `
  // ${n.name.replace(/[\r\n]/g, ' ')}
  graphics_context_set_text_color(ctx, color_hex(0x${fillHex.toString(16).padStart(6, '0')}));
  graphics_draw_text(ctx, "${escapeText(n.text || '')}", ${fontExpr},
                     ${mappedRect(n)}, GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);`
      }

      if (n.type === 'time') {
        const idx = times.indexOf(n)
        const fillHex = toHexInt(n.fill || '#ffffff')
        const fontExpr = n.customFontId
          ? getCustomFontVarName(n)
          : `font_for("${escapeText(n.fontFamily || '')}", ${Math.round(n.fontSize || 14)}, ${n.bold ? 'true' : 'false'})`

        return `
  // ${n.name.replace(/[\r\n]/g, ' ')}
  {
    char time_buffer_${idx}[32];
    time_t now_${idx} = time(NULL);
    struct tm *tick_${idx} = localtime(&now_${idx});
    strftime(time_buffer_${idx}, sizeof(time_buffer_${idx}), s_time_fmt_${idx}, tick_${idx});
    graphics_context_set_text_color(ctx, color_hex(0x${fillHex.toString(16).padStart(6, '0')}));
    graphics_draw_text(ctx, time_buffer_${idx}, ${fontExpr},
                       ${mappedRect(n)}, GTextOverflowModeFill, GTextAlignmentCenter, NULL);
  }`
      }

      return ''
    })
    .join('\n')

  const createGPaths = drawableGPaths
    .map(
      (n, idx) => `
  s_gpath_${idx} = gpath_create(&s_gpath_info_${idx});
  gpath_rotate_to(s_gpath_${idx}, deg_to_trig(${Math.round(n.rotation || 0)}));`,
    )
    .join('\n')

  const destroyGPaths =
    drawableGPaths.length > 0
      ? drawableGPaths
          .map(
            (_, idx) => `
  if (s_gpath_${idx}) {
    gpath_destroy(s_gpath_${idx});
    s_gpath_${idx} = NULL;
  }`,
          )
          .join('')
      : ''

  const loadBitmaps =
    bitmaps.length > 0
      ? `
  for (int i = 0; i < ${bitmaps.length}; i++) {
    s_bitmaps[i] = gbitmap_create_with_resource(s_bitmap_res_ids[i]);
  }`
      : ''

  const unloadBitmaps =
    bitmaps.length > 0
      ? `
  for (int i = 0; i < ${bitmaps.length}; i++) {
    if (s_bitmaps[i]) {
      gbitmap_destroy(s_bitmaps[i]);
      s_bitmaps[i] = NULL;
    }
  }`
      : ''

  const loadImageTimes =
    imageTimes.length > 0
      ? imageTimes
          .map(
            (node, idx) => `
  for (int i = 0; i < ${imageTimeGlyphKeys(node).length}; i++) {
    if (s_image_time_res_ids_${idx}[i] != 0) {
      s_image_time_bitmaps_${idx}[i] = gbitmap_create_with_resource(s_image_time_res_ids_${idx}[i]);
    } else {
      s_image_time_bitmaps_${idx}[i] = NULL;
    }
  }`,
          )
          .join('\n')
      : ''

  const unloadImageTimes =
    imageTimes.length > 0
      ? imageTimes
          .map(
            (node, idx) => `
  for (int i = 0; i < ${imageTimeGlyphKeys(node).length}; i++) {
    if (s_image_time_bitmaps_${idx}[i]) {
      gbitmap_destroy(s_image_time_bitmaps_${idx}[i]);
      s_image_time_bitmaps_${idx}[i] = NULL;
    }
  }`,
          )
          .join('')
      : ''

  return `#include <pebble.h>

static Window *s_main_window;
static Layer *s_root_layer;${bitmapDecls}
${imageTimeDecls}
${customFontDecls.join('\n')}
${gpathPointArrays}

static GColor color_hex(uint32_t hex) {
  return GColorFromRGB((hex >> 16) & 0xFF, (hex >> 8) & 0xFF, hex & 0xFF);
}

static GFont font_for(const char *family, int size, bool bold) {
${SYSTEM_FONTS.map(
  (f) =>
    `  if (strcmp(family, "${f.family}") == 0 && size == ${f.size} && bold == ${f.label.includes('Bold') ? 'true' : 'false'}) return fonts_get_system_font(${f.key});`,
).join('\n')}
  return fonts_get_system_font(FONT_KEY_GOTHIC_14);
}

static int32_t deg_to_trig(int32_t degrees) {
  int32_t d = degrees % 360;
  if (d < 0) d += 360;
  return (TRIG_MAX_ANGLE * d) / 360;
}

#define DESIGN_WIDTH ${designWidth}
#define DESIGN_HEIGHT ${designHeight}

static int map_axis(int position, int size, int source_size, int target_size) {
  return (((position * 2 + size) * target_size) / (source_size * 2)) - (size / 2);
}

static int map_x(int x, int width, GRect bounds) {
  return map_axis(x, width, DESIGN_WIDTH, bounds.size.w);
}

static int map_y(int y, int height, GRect bounds) {
  return map_axis(y, height, DESIGN_HEIGHT, bounds.size.h);
}

static GRect mapped_rect(int x, int y, int width, int height, GRect bounds) {
  return GRect(map_x(x, width, bounds), map_y(y, height, bounds), width, height);
}

${tickUnit ? `
static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  layer_mark_dirty(s_root_layer);
}` : ''}

${timeFormats || ''}

static void layer_update_proc(Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_bounds(layer);
  graphics_context_set_fill_color(ctx, color_hex(0x${backgroundColorHex.toString(16).padStart(6, '0')}));
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);
${drawAllLayers}
}

static void main_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);${loadBitmaps}
${loadImageTimes}
${customFontLoads.join('\n')}
${createGPaths}

  s_root_layer = layer_create(bounds);
  layer_set_update_proc(s_root_layer, layer_update_proc);
  layer_add_child(window_layer, s_root_layer);
${tickUnit ? `  tick_timer_service_subscribe(${tickUnit}, tick_handler);` : ''}
}

static void main_window_unload(Window *window) {
${tickUnit ? `  tick_timer_service_unsubscribe();` : ''}${unloadBitmaps}
${unloadImageTimes}
  layer_destroy(s_root_layer);
${customFontUnloads.join('\n')}
${destroyGPaths}
}

static void init(void) {
  s_main_window = window_create();
  window_set_window_handlers(s_main_window, (WindowHandlers){
                                           .load = main_window_load,
                                           .unload = main_window_unload,
                                       });
  window_stack_push(s_main_window, true);
}

static void deinit(void) {
  window_destroy(s_main_window);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
`
}

const escapeText = (value: string) => value.replace(/"/g, '\\"')

const toHexInt = (color: string) => {
  const hex = color.replace('#', '')
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  return parseInt(full, 16)
}

const round = (value: number) => Math.round(value)

const sanitizeResourceName = (name: string) =>
  name
    .trim()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase() || 'IMAGE_1'

const sanitizeFileName = (name: string) =>
  name
    .trim()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'image'

const buildImageTimeLayout = (node: ImageTimeNode) =>
  buildImageTimePositions(node.width, imageTimeCharCount(node), node.charSpacing, node.groupSpacing)

const escapeCChar = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const escapeCString = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

const strftimeForFormat = (format: TimeNode['format'], kind: TimeNode['text']) => {
  switch (format) {
    case 'HH:mm':
      return '%H:%M'
    case 'HH:mm:ss':
      return '%H:%M:%S'
    case 'hh:mm a':
      return '%I:%M %p'
    case 'hh:mm:ss a':
      return '%I:%M:%S %p'
    case 'YYYY-MM-DD':
      return '%Y-%m-%d'
    case 'ddd, MMM D':
      return '%a, %b %e'
    case 'MMM D, YYYY':
      return '%b %e, %Y'
    case 'DD/MM/YYYY':
      return '%d/%m/%Y'
    case 'MM/DD/YYYY':
      return '%m/%d/%Y'
    default:
      return kind === 'date' ? '%Y-%m-%d' : '%H:%M'
  }
}

const convertCustomFormatToStrftime = (custom: string, type: string = 'date') => {
  let s = custom
  s = s.replace(/%/g, '%%')
  const map: Record<string, string> = {
    yyyy: '%Y',
    yy: '%y',
    MMM: '%b',
    mmm: '%b',
    E: '%u',
    MM: type === 'time' ? '%M' : '%m',
    M: '%m',
    dd: '%d',
    d: '%e',
    HH: '%H',
    hh: '%I',
    SS: '%S',
    APM: '%p',
  }
  s = s.replace(/yyyy|yy|MMM|mmm|E|MM|M|dd|d|HH|hh|SS|APM/g, (match) => {
    return map[match] || match
  })
  return s
}

const imageToPngBlob = (src: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas toBlob failed'))
        }
      }, 'image/png')
    }
    img.onerror = (err) => reject(err)
    img.src = src
  })
}

const imageToContainedPngBlob = (src: string, targetWidth: number, targetHeight: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, targetWidth)
      canvas.height = Math.max(1, targetHeight)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      const fitted = fitBitmapWithinBox(img.width, img.height, canvas.width, canvas.height)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(img, fitted.offsetX, fitted.offsetY, fitted.width, fitted.height)
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas toBlob failed'))
        }
      }, 'image/png')
    }
    img.onerror = (err) => reject(err)
    img.src = src
  })
}

const fitBitmapWithinBox = (sourceWidth: number, sourceHeight: number, maxWidth: number, maxHeight: number) => {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: maxWidth, height: maxHeight, offsetX: 0, offsetY: 0 }
  }
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight)
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  return {
    width,
    height,
    offsetX: Math.floor((maxWidth - width) / 2),
    offsetY: Math.floor((maxHeight - height) / 2),
  }
}
