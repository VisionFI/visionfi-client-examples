"""
VisionFi CLI Banner Module
Contains styling and banner display for the VisionFi CLI tool
"""

import os
import sys
from colorama import init, Fore, Back, Style

# Initialize colorama for cross-platform color support
init()

# Define VisionFi brand colors based on user selections
WHITE = Fore.WHITE + Style.BRIGHT  # White for menu brackets & bold text
LIGHT_GRAY = "\033[38;5;250m"  # Light gray for Vision part & subheadings
DARK_RED = "\033[38;5;124m"  # Dark Red for Fi part (replacing Navy Blue)
LIGHT_BLUE = "\033[38;5;27m"  # Light blue for info messages
BRIGHT_RED = "\033[38;5;196m"  # Bright Red for error messages
DIM = Style.DIM
BRIGHT = Style.BRIGHT
RESET = Style.RESET_ALL

# Box drawing characters for the banner frame
BOX_HORIZONTAL = "━"
BOX_VERTICAL = "┃"
BOX_TOP_LEFT = "┏"
BOX_TOP_RIGHT = "┓"
BOX_BOTTOM_LEFT = "┗"
BOX_BOTTOM_RIGHT = "┛"

def get_ascii_art_path():
    """Get the path to the ASCII art file."""
    # Find the directory where this script is located
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Look for visionfi_ascii.txt in the common directory (parent/common)
    common_dir = os.path.join(os.path.dirname(current_dir), 'common')
    ascii_path = os.path.join(common_dir, 'visionfi_ascii.txt')
    
    return ascii_path

def display_banner():
    """Display the VisionFi banner with brand colors."""
    # Clear the screen (cross-platform)
    os.system('cls' if os.name == 'nt' else 'clear')
    
    # Get the path to the ASCII art file
    ascii_path = get_ascii_art_path()
    
    try:
        # Read the ASCII art from the file
        with open(ascii_path, "r") as f:
            ascii_art = f.read()
    except FileNotFoundError:
        # Fallback ASCII art if file not found
        ascii_art = """
VVVVVVVV           VVVVVVVV iiii                     iiii                                     FFFFFFFFFFFFFFFFFFFFFFIIIIIIIIII
V::::::V           V::::::Vi::::i                   i::::i                                    F::::::::::::::::::::FI::::::::I
V::::::V           V::::::V iiii                     iiii                                     F::::::::::::::::::::FI::::::::I
V::::::V           V::::::V                                                                   FF::::::FFFFFFFFF::::FII::::::II
 V:::::V           V:::::Viiiiiii     ssssssssss   iiiiiii    ooooooooooo   nnnn  nnnnnnnn      F:::::F       FFFFFF  I::::I  
  V:::::V         V:::::V i:::::i   ss::::::::::s  i:::::i  oo:::::::::::oo n:::nn::::::::nn    F:::::F               I::::I  
   V:::::V       V:::::V   i::::i ss:::::::::::::s  i::::i o:::::::::::::::on::::::::::::::nn   F::::::FFFFFFFFFF     I::::I  
    V:::::V     V:::::V    i::::i s::::::ssss:::::s i::::i o:::::ooooo:::::onn:::::::::::::::n  F:::::::::::::::F     I::::I  
     V:::::V   V:::::V     i::::i  s:::::s  ssssss  i::::i o::::o     o::::o  n:::::nnnn:::::n  F:::::::::::::::F     I::::I  
      V:::::V V:::::V      i::::i    s::::::s       i::::i o::::o     o::::o  n::::n    n::::n  F::::::FFFFFFFFFF     I::::I  
       V:::::V:::::V       i::::i       s::::::s    i::::i o::::o     o::::o  n::::n    n::::n  F:::::F               I::::I  
        V:::::::::V        i::::i ssssss   s:::::s  i::::i o::::o     o::::o  n::::n    n::::n  F:::::F               I::::I  
         V:::::::V        i::::::is:::::ssss::::::si::::::io:::::ooooo:::::o  n::::n    n::::nFF:::::::FF           II::::::II
          V:::::V         i::::::is::::::::::::::s i::::::io:::::::::::::::o  n::::n    n::::nF::::::::FF           I::::::::I
           V:::V          i::::::i s:::::::::::ss  i::::::i oo:::::::::::oo   n::::n    n::::nF::::::::FF           I::::::::I
            VVV           iiiiiiii  sssssssssss    iiiiiiii   ooooooooooo     nnnnnn    nnnnnnFFFFFFFFFFF           IIIIIIIIII
        """
    
    # Apply colors based on user selections
    colored_lines = []
    for line in ascii_art.split('\n'):
        # Start with a fresh line for each iteration
        original_line = line
        colored_chars = []
        
        # Process each character with proper color
        for i, char in enumerate(original_line):
            if char in 'Vson:':  # VisionFi "Vision" part
                colored_chars.append(f'{LIGHT_GRAY}{char}{RESET}')
            elif char in 'FI':  # VisionFi "Fi" part
                colored_chars.append(f'{WHITE}{char}{RESET}')
            elif char == 'i':  # VisionFi "i" part
                colored_chars.append(f'{LIGHT_GRAY}{char}{RESET}')
            elif char not in ' \n\t':  # Other non-whitespace characters
                colored_chars.append(f'{LIGHT_GRAY}{char}{RESET}')
            else:
                colored_chars.append(char)  # Keep whitespace as is
        
        # Join all colored characters back into a line
        colored_line = ''.join(colored_chars)
        colored_lines.append(colored_line)
    
    # Print the colored ASCII art
    print('\n'.join(colored_lines))
    
    # Calculate width of the bottom banner
    width = max(len(line) for line in ascii_art.split('\n'))
    
    # Print the bottom banner box with light gray border
    border_color = LIGHT_GRAY  # Light Gray for border as per user selection
    
    print(f"{border_color}{BOX_TOP_LEFT}{BOX_HORIZONTAL * (width - 2)}{BOX_TOP_RIGHT}{RESET}")
    print(f"{border_color}{BOX_VERTICAL}{RESET}  {WHITE}CLI Test Tool{RESET}{' ' * (width - 90)}The Power Of Inference.{' ' * 42}{DIM}v1.0.0{RESET}{border_color}  {BOX_VERTICAL}{RESET}")
    print(f"{border_color}{BOX_BOTTOM_LEFT}{BOX_HORIZONTAL * (width - 2)}{BOX_BOTTOM_RIGHT}{RESET}")
    print()  # Add an empty line after the banner

# UI element colors based on user selections
MENU_COLOR = WHITE  # White for menu brackets
HEADING_COLOR = WHITE  # Bold white for headings
SUBHEADING_COLOR = LIGHT_GRAY  # Light gray for subheadings
ERROR_COLOR = BRIGHT_RED  # Bright Red for error messages (replacing Deep Red)
INFO_COLOR = LIGHT_BLUE  # Light blue for info messages

def title(text):
    """Format text as a title with VisionFi branding."""
    return f"{HEADING_COLOR}{text}{RESET}"

def subtitle(text):
    """Format text as a subtitle with VisionFi branding."""
    return f"{SUBHEADING_COLOR}{text}{RESET}"

def success(text):
    """Format text as a success message."""
    return f"{Fore.GREEN}{BRIGHT}{text}{RESET}"

def error(text):
    """Format text as an error message."""
    return f"{ERROR_COLOR}{text}{RESET}"

def warning(text):
    """Format text as a warning message."""
    return f"{ERROR_COLOR}{DIM}{text}{RESET}"

def info(text):
    """Format text as an info message."""
    return f"{INFO_COLOR}{text}{RESET}"

def menu_option(key, text):
    """Format a menu option with VisionFi branding."""
    return f"{MENU_COLOR}[{key}]{RESET} {text}"

if __name__ == "__main__":
    # Test the banner
    display_banner()
    print(title("DEVELOPER TOOLS"))
    print(subtitle("Advanced features for development and debugging"))
    print()
    print(menu_option("1", "Test Authentication"))
    print(menu_option("2", "Toggle Debug Mode (OFF)"))
    print(menu_option("3", "GET A TOKEN - Retrieve live API authentication token"))
    print()
    print(menu_option("b", "Back to Main Menu"))
    print(menu_option("q", "Quit"))
    print()