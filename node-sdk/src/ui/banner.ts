import * as fs from 'fs';
import * as path from 'path';
import * as figlet from 'figlet';
import chalk from 'chalk';
import { LIGHT_GRAY, WHITE, DIM } from './colors';

// Box drawing characters for the banner frame (matching Python CLI)
const BOX_HORIZONTAL = '━';
const BOX_VERTICAL = '┃';
const BOX_TOP_LEFT = '┏';
const BOX_TOP_RIGHT = '┓';
const BOX_BOTTOM_LEFT = '┗';
const BOX_BOTTOM_RIGHT = '┛';

/**
 * Get the path to the ASCII art file
 */
function getAsciiArtPath(): string {
  // Look in the common directory at the repository root
  const currentDir = path.dirname(__dirname);
  const srcDir = path.dirname(currentDir);
  const rootDir = path.dirname(srcDir);
  const commonDir = path.join(rootDir, 'common');
  
  return path.join(commonDir, 'visionfi_ascii.txt');
}

/**
 * Generate fallback ASCII art if the file is not found
 */
function generateFallbackAscii(): string {
  return figlet.textSync('VisionFi', {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  });
}

/**
 * Display the VisionFi banner with brand colors
 */
export function displayBanner(): void {
  // Clear the screen
  console.clear();
  
  // Get the path to the ASCII art file
  const asciiPath = getAsciiArtPath();
  
  let asciiArt: string;
  try {
    // Read the ASCII art from the file
    asciiArt = fs.readFileSync(asciiPath, 'utf8');
  } catch (error) {
    // Fallback ASCII art if file not found
    asciiArt = generateFallbackAscii();
  }
  
  // Apply colors to the ASCII art
  const coloredLines = asciiArt.split('\n').map(line => {
    return line.split('').map(char => {
      if ('Vson:'.includes(char)) {
        return LIGHT_GRAY(char);
      } else if ('FI'.includes(char)) {
        return WHITE(char);
      } else if (char === 'i') {
        return LIGHT_GRAY(char);
      } else if (![' ', '\\n', '\\t'].includes(char)) {
        return LIGHT_GRAY(char);
      } else {
        return char;
      }
    }).join('');
  }).join('\n');
  
  // Print the colored ASCII art
  console.log(coloredLines);
  
  // Calculate width of the bottom banner
  const maxLineLength = Math.max(...asciiArt.split('\n').map(line => line.length));
  
  // Print the bottom banner box
  const borderColor = LIGHT_GRAY;
  
  console.log(`${borderColor(BOX_TOP_LEFT)}${borderColor(BOX_HORIZONTAL.repeat(maxLineLength - 2))}${borderColor(BOX_TOP_RIGHT)}`);
  console.log(`${borderColor(BOX_VERTICAL)}  ${WHITE('CLI Test Tool')}${' '.repeat(maxLineLength - 90)}The Power Of Inference.${' '.repeat(42)}${DIM('v1.0.0')}${borderColor('  ' + BOX_VERTICAL)}`);
  console.log(`${borderColor(BOX_BOTTOM_LEFT)}${borderColor(BOX_HORIZONTAL.repeat(maxLineLength - 2))}${borderColor(BOX_BOTTOM_RIGHT)}`);
  console.log(); // Add an empty line after the banner
}