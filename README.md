# Pebble Face Studio

A visual, modern watchface editor for the Pebble smartwatch ecosystem. Design your watchfaces in the browser and export ready-to-compile C projects for the Pebble SDK.

![Version](https://img.shields.io/badge/version-MVP-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Visual Canvas Editor**: Drag, drop, scale, and rotate elements on a pixel-perfect canvas.
- **Multiple Element Types**:
  - **Rectangles**: Backgrounds, accents, and shapes.
  - **Text**: Static text with custom or system fonts.
  - **Time/Date**: Dynamic time elements with multiple formatting options.
  - **Bitmaps**: Upload and position PNG images.
  - **GPaths**: Create custom vector paths and outlines.
- **Pebble System Fonts**: Full support for standard Pebble fonts including Raster Gothic, Bitham, Roboto, and LECO 1976.
- **Custom Font Support**: Upload your own `.ttf` or `.otf` files to use in your design.
- **Monochrome Preview**: Toggle Aplite-style black & white preview to see how your design looks on original Pebble hardware.
- **Project Management**:
  - Save and load work-in-progress using the `.pfs` (Pebble Face Studio) file format.
  - Rename projects on the fly.
  - Customize the global watchface background color.
- **Export to SDK**: Download a `.zip` bundle containing a complete Pebble project (`main.c`, `package.json`, `wscript`, and resources) ready for the Pebble SDK.

## Tech Stack

- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Canvas Rendering**: [react-konva](https://konvajs.org/docs/react/index.html)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Styling**: Tailwind CSS + Shadcn UI
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (recommended) or npm/yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/pebble-face-studio.git
   cd pebble-face-studio
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Open your browser to `http://localhost:5173`.

### Building for Production

To create an optimized production build:
```bash
pnpm build
```

## How to Use

1. **New Project**: Select your target platform (Basalt, Chalk, or Emery) and give your project a name.
2. **Design**: Use the toolbar on the left to add elements. Use the properties panel on the right to tweak coordinates, colors, and font settings.
3. **Save Progress**: Click **"Save (.pfs)"** to download a local backup of your project. You can resume later by using the "Import" button in the New Project window.
4. **Export**: Once satisfied, click **"Export (zip)"** to get your Pebble SDK source code.

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for the Pebble enthusiast community.
- Inspired by the original CloudPebble editor.
- Custom fonts provided in `@fonts/` are for preview purposes and subject to their respective licenses.