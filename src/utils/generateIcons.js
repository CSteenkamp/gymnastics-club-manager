// Icon generation utility for PWA
// This creates simple placeholder icons that can be replaced with professional designs

const fs = require('fs')
const path = require('path')

// Simple SVG icon template
const createSVGIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#7c3aed" rx="${size * 0.15}"/>
  <g transform="translate(${size * 0.1}, ${size * 0.1})">
    <!-- Gymnastics figure -->
    <circle cx="${size * 0.4}" cy="${size * 0.2}" r="${size * 0.08}" fill="white"/>
    <path d="M ${size * 0.4} ${size * 0.28} 
             L ${size * 0.3} ${size * 0.5}
             L ${size * 0.25} ${size * 0.65}
             M ${size * 0.4} ${size * 0.28}
             L ${size * 0.5} ${size * 0.5}
             L ${size * 0.55} ${size * 0.65}
             M ${size * 0.4} ${size * 0.28}
             L ${size * 0.35} ${size * 0.4}
             L ${size * 0.2} ${size * 0.35}
             M ${size * 0.4} ${size * 0.28}
             L ${size * 0.45} ${size * 0.4}
             L ${size * 0.6} ${size * 0.35}" 
          stroke="white" stroke-width="${size * 0.02}" fill="none" stroke-linecap="round"/>
  </g>
  <text x="${size * 0.5}" y="${size * 0.9}" 
        text-anchor="middle" 
        fill="white" 
        font-family="system-ui, sans-serif" 
        font-size="${size * 0.12}" 
        font-weight="bold">CG</text>
</svg>
`

// Generate icons for different sizes
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512]

const iconsDir = path.join(__dirname, '../../public/icons')

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// Generate SVG icons
iconSizes.forEach(size => {
  const svgContent = createSVGIcon(size)
  const filename = `icon-${size}x${size}.svg`
  fs.writeFileSync(path.join(iconsDir, filename), svgContent)
  console.log(`Generated ${filename}`)
})

// Create additional shortcut icons
const shortcutIcons = {
  'shortcut-admin.svg': createSVGIcon(96).replace('CG', 'A'),
  'shortcut-dashboard.svg': createSVGIcon(96).replace('CG', 'D'),
  'shortcut-payments.svg': createSVGIcon(96).replace('CG', 'P')
}

Object.entries(shortcutIcons).forEach(([filename, content]) => {
  fs.writeFileSync(path.join(iconsDir, filename), content)
  console.log(`Generated ${filename}`)
})

console.log('PWA icons generated successfully!')
console.log('Note: These are placeholder SVG icons. For production, replace with professional PNG icons.')