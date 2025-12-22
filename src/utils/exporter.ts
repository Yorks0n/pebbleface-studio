import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { type SceneNode, type BitmapNode, type TimeNode, type GPathNode } from '../store/scene'

type PebbleResource = {
  type: string
  name: string
  file: string
}

const dataUrlToUint8 = async (dataUrl: string) => {
  const res = await fetch(dataUrl)
  const buf = await res.arrayBuffer()
  return new Uint8Array(buf)
}

export async function exportPebbleProject(nodes: SceneNode[], projectName: string) {
  const zip = new JSZip()
  const media: PebbleResource[] = []
  const src = zip.folder('src')
  const res = zip.folder('resources')?.folder('images')

  const bitmapNodes = nodes.filter((n) => n.type === 'bitmap') as BitmapNode[]
  for (const bmp of bitmapNodes) {
    // Force filename to end with .png
    const baseName = bmp.fileName ? bmp.fileName.replace(/\.[^/.]+$/, '') : bmp.name
    const fileName = `${baseName}.png`
    const filePath = `images/${fileName}`
    const resourceName = sanitizeResourceName(bmp.name)
    media.push({ type: 'png', name: resourceName, file: filePath })
    
    if (res) {
      let pngData: Uint8Array

      // Strategy: 
      // 1. If original file exists and is PNG, use it (highest quality).
      // 2. If dataUrl is PNG, use it.
      // 3. Otherwise, convert dataUrl to PNG.
      
      if (bmp.file && bmp.file.type === 'image/png') {
         const buf = await bmp.file.arrayBuffer()
         pngData = new Uint8Array(buf)
      } else if (bmp.dataUrl.startsWith('data:image/png')) {
         pngData = await dataUrlToUint8(bmp.dataUrl)
      } else {
         // Convert non-PNG (jpg, etc) to PNG blob
         const blob = await imageToPngBlob(bmp.dataUrl)
         pngData = new Uint8Array(await blob.arrayBuffer())
      }
      
      res.file(fileName, pngData)
    }
  }

  src?.file('main.c', templateMainC(nodes))
  zip.file('package.json', JSON.stringify(templatePebblePackage(projectName, media), null, 2))
  zip.file('wscript', templateWscript)

  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `${projectName}.zip`)
}

const templatePebblePackage = (projectName: string, resources: PebbleResource[]) => ({
  name: slugify(projectName),
  author: 'Pebble Studio',
  version: '1.0.0',
  keywords: ['pebble-app'],
  private: true,
  dependencies: {},
  pebble: {
    displayName: projectName,
    uuid: randomUuid(),
    sdkVersion: '3',
    enableMultiJS: true,
    targetPlatforms: ['aplite', 'basalt', 'chalk', 'diorite', 'emery', 'flint'],
    watchapp: { watchface: true },
    messageKeys: ['dummy'],
    resources: {
      media: resources.map((r) => ({ ...r, type: 'bitmap' })),
    },
  },
})

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

const randomUuid = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  return `${s4()}${s4()}-${s4()}-4${s4().substring(1)}-${((8 + Math.random() * 4) | 0).toString(16)}${s4().substring(1)}-${s4()}${s4()}${s4()}`
}

const templateMainC = (nodes: SceneNode[]) => {
  const times = nodes.filter((n) => n.type === 'time') as TimeNode[]
  const bitmaps = nodes.filter((n) => n.type === 'bitmap') as BitmapNode[]
  const gpaths = nodes.filter((n) => n.type === 'gpath') as GPathNode[]

  const bitmapResIds = bitmaps.map((b) => `RESOURCE_ID_${sanitizeResourceName(b.name)}`)

  const timeFormats = times
    .map((t, idx) => `static const char *s_time_fmt_${idx} = "${strftimeForFormat(t.format, t.text)}";`)
    .join('\n')

  const bitmapDecls =
    bitmaps.length > 0
      ? `
static GBitmap *s_bitmaps[${bitmaps.length}];
static const uint32_t s_bitmap_res_ids[${bitmaps.length}] = { ${bitmapResIds.join(', ')} };`
      : ''

  const gpathPointArrays = gpaths
    .filter((n) => n.points.length > 1)
    .map((n, idx) => {
      const points = n.points
        .map((p) => `  { ${round(p.x)}, ${round(p.y)} }`)
        .join(',\n')
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

  const drawAllLayers = nodes
    .map((n) => {
      if (n.type === 'rect') {
        const fillHex = toHexInt(n.fill || '#000000')
        const strokeHex = toHexInt(n.stroke || '#000000')
        return `
  // ${n.name}
  graphics_context_set_fill_color(ctx, color_hex(0x${fillHex.toString(16).padStart(6, '0')}));
  graphics_fill_rect(ctx, GRect(${round(n.x)}, ${round(n.y)}, ${round(n.width)}, ${round(n.height)}), 0, GCornerNone);
  graphics_context_set_stroke_color(ctx, color_hex(0x${strokeHex.toString(16).padStart(6, '0')}));
  graphics_context_set_stroke_width(ctx, ${Math.max(1, n.strokeWidth || 1)});
  graphics_draw_rect(ctx, GRect(${round(n.x)}, ${round(n.y)}, ${round(n.width)}, ${round(n.height)}));`
      }

      if (n.type === 'bitmap') {
        const idx = bitmaps.indexOf(n)
        return `
  // ${n.name}
  if (s_bitmaps[${idx}]) {
    graphics_draw_bitmap_in_rect(ctx, s_bitmaps[${idx}], GRect(${round(n.x)}, ${round(n.y)}, ${round(n.width)}, ${round(n.height)}));
  }`
      }

      if (n.type === 'gpath' && n.points.length > 1) {
        const idx = drawableGPaths.indexOf(n)
        const strokeHex = toHexInt(n.stroke || '#ffffff')
        return `
  // ${n.name}
  graphics_context_set_stroke_color(ctx, color_hex(0x${strokeHex.toString(16).padStart(6, '0')}));
  graphics_context_set_stroke_width(ctx, ${Math.max(1, Math.round(n.strokeWidth || 1))});
  if (s_gpath_${idx}) {
    gpath_move_to(s_gpath_${idx}, GPoint(${round(n.x)}, ${round(n.y)}));
    gpath_draw_outline(ctx, s_gpath_${idx});
  }`
      }

      if (n.type === 'text') {
        const fillHex = toHexInt(n.fill || '#ffffff')
        return `
  // ${n.name}
  graphics_context_set_text_color(ctx, color_hex(0x${fillHex.toString(16).padStart(6, '0')}));
  graphics_draw_text(ctx, "${escapeText(n.text || '')}", font_for("${escapeText(
          n.fontFamily || '',
        )}", ${Math.round(n.fontSize || 18)}),
                     GRect(${round(n.x)}, ${round(n.y)}, ${round(n.width)}, ${round(n.height)}), GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);`
      }

      if (n.type === 'time') {
        const idx = times.indexOf(n)
        const fillHex = toHexInt(n.fill || '#ffffff')
        return `
  // ${n.name}
  {
    char time_buffer_${idx}[32];
    time_t now_${idx} = time(NULL);
    struct tm *tick_${idx} = localtime(&now_${idx});
    strftime(time_buffer_${idx}, sizeof(time_buffer_${idx}), s_time_fmt_${idx}, tick_${idx});
    graphics_context_set_text_color(ctx, color_hex(0x${fillHex.toString(16).padStart(6, '0')}));
    graphics_draw_text(ctx, time_buffer_${idx}, font_for("${escapeText(n.fontFamily || '')}", ${Math.round(
          n.fontSize || 18,
        )}),
                       GRect(${round(n.x)}, ${round(n.y)}, ${round(n.width)}, ${round(n.height)}), GTextOverflowModeFill, GTextAlignmentLeft, NULL);
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

  return `#include <pebble.h>

static Window *s_main_window;
static Layer *s_root_layer;${bitmapDecls}
${gpathPointArrays}

static GColor color_hex(uint32_t hex) {
  return GColorFromRGB((hex >> 16) & 0xFF, (hex >> 8) & 0xFF, hex & 0xFF);
}

static GFont font_for(const char *name, int size) {
  if (strstr(name, "Bitham") || strstr(name, "Gotham")) {
    if (size >= 30) return fonts_get_system_font(FONT_KEY_BITHAM_30_BLACK);
    if (size >= 28) return fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD);
    return fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD);
  }
  if (strstr(name, "Droid")) {
    if (size >= 28) return fonts_get_system_font(FONT_KEY_DROID_SERIF_28_BOLD);
    return fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD);
  }
  if (strstr(name, "LECO")) {
    return fonts_get_system_font(FONT_KEY_LECO_20_BOLD_NUMBERS);
  }
  return fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD);
}

static int32_t deg_to_trig(int32_t degrees) {
  int32_t d = degrees % 360;
  if (d < 0) d += 360;
  return (TRIG_MAX_ANGLE * d) / 360;
}

${timeFormats || ''}

static void layer_update_proc(Layer *layer, GContext *ctx) {
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_fill_rect(ctx, layer_get_bounds(layer), 0, GCornerNone);
${drawAllLayers}
}

static void main_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);${loadBitmaps}
${createGPaths}

  s_root_layer = layer_create(bounds);
  layer_set_update_proc(s_root_layer, layer_update_proc);
  layer_add_child(window_layer, s_root_layer);
}

static void main_window_unload(Window *window) {${unloadBitmaps}
  layer_destroy(s_root_layer);
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

const imageToPngBlob = (src: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // Enable CORS if needed
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
