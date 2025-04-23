import chalk from 'chalk';
import gradient from 'gradient-string';

// Define VisionFi brand colors (matching Python CLI)
export const WHITE = chalk.whiteBright;
export const LIGHT_GRAY = chalk.rgb(250, 250, 250);
export const DARK_RED = chalk.rgb(124, 10, 10);
export const LIGHT_BLUE = chalk.rgb(27, 149, 224);
export const BRIGHT_RED = chalk.rgb(196, 0, 0);
export const DIM = chalk.dim;
export const BRIGHT = chalk.bold;
export const RESET = chalk.reset;

// UI element colors (matching Python CLI)
export const MENU_COLOR = WHITE;
export const HEADING_COLOR = WHITE;
export const SUBHEADING_COLOR = LIGHT_GRAY;
export const ERROR_COLOR = BRIGHT_RED;
export const INFO_COLOR = LIGHT_BLUE;

// Text formatting functions
export function title(text: string): string {
  return HEADING_COLOR(text);
}

export function subtitle(text: string): string {
  return SUBHEADING_COLOR(text);
}

export function success(text: string): string {
  return chalk.green.bold(text);
}

export function error(text: string): string {
  return ERROR_COLOR(text);
}

export function warning(text: string): string {
  return ERROR_COLOR(DIM(text));
}

export function info(text: string): string {
  return INFO_COLOR(text);
}

export function menuOption(key: string, text: string): string {
  return `${MENU_COLOR(`[${key}]`)} ${text}`;
}