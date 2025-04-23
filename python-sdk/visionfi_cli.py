#!/usr/bin/env python3
"""
VisionFi CLI
Command-line interface for interacting with the VisionFi API
"""

import os
import sys
import argparse
import json
import time
from pathlib import Path

# Import paths have been adjusted for the new file location
# Note: The package is named 'visionfi-client' for pip installation
# but uses the 'visionfi' namespace for imports

# Import VisionFi package
try:
    from visionfi import VisionFi
    from visionfi.exceptions import VisionFiError
except ImportError:
    print("visionfi package not found. Please ensure the visionfi-client package is installed.")
    print("Run: pip install visionfi-client")
    sys.exit(1)

# Import local modules
from banner import display_banner, title, subtitle, menu_option, success, error, warning, info

# Config paths
DEFAULT_CONFIG_PATH = os.path.expanduser("~/.visionfi/config.json")
DEFAULT_KEY_DIR = os.path.expanduser("~/.visionfi/keys")
SERVICE_ACCOUNT_KEY_NAME = "visionfi_service_account.json"

# Default config values
DEFAULT_CONFIG = {
    "service_account_path": "",
    "api_endpoint": "https://platform.visionfi.ai/api/v1",
    "recent_uuids": [],
    "debug_mode": False,
    "test_mode": False,  # Add test_mode flag for browsing example files
    "workflow_cache_ttl": 1200,  # Workflow cache time-to-live in seconds (20 minutes)
}

class VisionFiCLI:
    """VisionFi CLI Manager"""
    
    def __init__(self):
        self.config = self.load_config()
        self.client = None
        
        # Initialize workflow cache
        self._cached_workflows = None
        self._workflows_cached_at = 0
        self._workflow_cache_ttl = self.config.get("workflow_cache_ttl", 1200)  # Get from config
        
        # Find the examples/files directory in the common folder
        script_dir = os.path.dirname(os.path.abspath(__file__))
        # Files directory is now in the common folder at the repository root
        common_dir = os.path.join(os.path.dirname(script_dir), "common")
        self.examples_files_dir = os.path.join(common_dir, "files")
        
        # Initialize the client if service account path is set
        if self.config["service_account_path"]:
            try:
                self.client = VisionFi(
                    service_account_path=self.config["service_account_path"],
                    api_endpoint=self.config["api_endpoint"]
                )
            except Exception as e:
                if self.config["debug_mode"]:
                    print(error(f"Failed to initialize client: {str(e)}"))
    
    def load_config(self):
        """Load configuration from file or create with defaults."""
        config_path = Path(DEFAULT_CONFIG_PATH)
        
        # Create config directory if it doesn't exist
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Create key directory if it doesn't exist
        Path(DEFAULT_KEY_DIR).mkdir(parents=True, exist_ok=True)
        
        # Load existing config or create new one
        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                
                # Ensure all keys exist
                for key, value in DEFAULT_CONFIG.items():
                    if key not in config:
                        config[key] = value
                
                return config
            except Exception:
                print(warning("Error loading config file. Using defaults."))
                return DEFAULT_CONFIG
        else:
            # Create new config file with defaults
            with open(config_path, 'w') as f:
                json.dump(DEFAULT_CONFIG, f, indent=2)
            
            return DEFAULT_CONFIG
    
    def save_config(self):
        """Save configuration to file."""
        with open(DEFAULT_CONFIG_PATH, 'w') as f:
            json.dump(self.config, f, indent=2)
    
    def interactive_mode(self):
        """Run the CLI in interactive mode."""
        display_banner()

        # Check if service account is already in the default location
        default_key_path = os.path.join(DEFAULT_KEY_DIR, SERVICE_ACCOUNT_KEY_NAME)
        
        # Check if the client is initialized
        if not self.client:
            # Look for service account in default location
            if os.path.isfile(default_key_path):
                try:
                    # Initialize client with the found service account
                    self.client = VisionFi(
                        service_account_path=default_key_path,
                        api_endpoint=self.config["api_endpoint"]
                    )
                    
                    # Update config
                    self.config["service_account_path"] = default_key_path
                    self.save_config()
                    
                    print(success(f"Service account found in {DEFAULT_KEY_DIR}!"))
                    print(info("Testing authentication..."))
                    
                    try:
                        auth_result = self.client.verify_auth()
                        if auth_result.success:
                            print(success("Authentication successful!"))
                        else:
                            print(warning("Authentication check returned without error, but may not be fully authenticated."))
                    except Exception as e:
                        print(warning(f"Authentication test failed: {str(e)}"))
                    
                except Exception as e:
                    print(error(f"Failed to initialize client with discovered service account: {str(e)}"))
            else:
                print(warning("No service account configured."))
                print()
                print(subtitle("Service Account Setup"))
                print(info("VisionFi requires a service account JSON file to authenticate with the API."))
                print()
                print(subtitle("Instructions:"))
                print(f"1. Copy your service account JSON file to: {DEFAULT_KEY_DIR}")
                print(f"2. Name the file: {SERVICE_ACCOUNT_KEY_NAME}")
                print(f"3. Or provide a custom path below")
                print()
                
                setup_choice = input("How would you like to proceed? (1=Use custom path, 2=I'll add the file now) [2]: ").strip() or "2"
                
                if setup_choice == "1":
                    # Ask for custom path
                    service_account_path = input("Enter path to service account JSON file: ").strip()
                    
                    if service_account_path:
                        try:
                            # Expand user directory if needed
                            service_account_path = os.path.expanduser(service_account_path)
                            
                            # Validate the file exists
                            if not os.path.isfile(service_account_path):
                                print(error(f"File not found: {service_account_path}"))
                            else:
                                # Initialize client
                                self.client = VisionFi(
                                    service_account_path=service_account_path,
                                    api_endpoint=self.config["api_endpoint"]
                                )
                                
                                # Update config
                                self.config["service_account_path"] = service_account_path
                                self.save_config()
                                
                                print(success("Service account configured successfully!"))
                        except Exception as e:
                            print(error(f"Failed to initialize client: {str(e)}"))
                else:
                    # Guide the user to add the file to the default location
                    print()
                    print(subtitle("Please follow these steps:"))
                    print(f"1. Create the directory if it doesn't exist: {DEFAULT_KEY_DIR}")
                    print(f"2. Copy your service account JSON file to this directory")
                    print(f"3. Rename the file to: {SERVICE_ACCOUNT_KEY_NAME}")
                    print(f"4. Then return to this CLI")
                    print()
                    
                    input("Press Enter when you've added the service account file...")
                    
                    # Check if the file now exists
                    if os.path.isfile(default_key_path):
                        try:
                            # Initialize client
                            self.client = VisionFi(
                                service_account_path=default_key_path,
                                api_endpoint=self.config["api_endpoint"]
                            )
                            
                            # Update config
                            self.config["service_account_path"] = default_key_path
                            self.save_config()
                            
                            print(success("Service account configured successfully!"))
                        except Exception as e:
                            print(error(f"Failed to initialize client: {str(e)}"))
                    else:
                        print(error(f"Service account file not found at: {default_key_path}"))
                        print(info("You can configure it later in the Account & Configuration menu."))
            
            print()  # Add spacing
        
        # Main menu loop
        while True:
            auth_status = "Not Authenticated"
            auth_color = error
            
            # Check authentication status if client is initialized
            if self.client:
                try:
                    # Try to verify authentication
                    auth_result = self.client.verify_auth()
                    if auth_result.success:
                        auth_status = "Authenticated"
                        auth_color = success
                except Exception:
                    pass
            
            # Display main menu
            os.system('cls' if os.name == 'nt' else 'clear')
            display_banner()
            
            print(f"Authentication Status: {auth_color(auth_status)}")
            print(f"API Endpoint: {info(self.config['api_endpoint'])}")
            print(f"Debug Mode: {info('Enabled' if self.config['debug_mode'] else 'Disabled')}")
            print(f"Test Mode: {info('Enabled' if self.config['test_mode'] else 'Disabled')}")
            print()
            
            print(title("MAIN MENU"))
            print()
            print(menu_option("1", "Document Analysis"))
            print(menu_option("2", "Retrieve Results"))
            print(menu_option("3", "Account & Configuration"))
            print(menu_option("4", "Developer Tools"))
            print()
            print(menu_option("q", "Quit"))
            print()
            
            choice = input("Enter your choice: ").strip().lower()
            
            if choice == 'q':
                print(info("Thank you for using VisionFi CLI!"))
                break
            elif choice == '1':
                self.show_document_analysis_menu()
            elif choice == '2':
                self.show_results_menu()
            elif choice == '3':
                self.show_config_menu()
            elif choice == '4':
                self.show_developer_menu()
            else:
                print(warning("Invalid choice. Please try again."))
                input("Press Enter to continue...")
    
    def get_cached_workflows(self, force_refresh=False):
        """Get workflows with caching.
        
        Args:
            force_refresh: If True, force a refresh of the cache
            
        Returns:
            The workflows response
        """
        now = time.time()
        # Check if cache is valid or if force refresh
        if (force_refresh or 
            self._cached_workflows is None or
            now - self._workflows_cached_at > self._workflow_cache_ttl):
            
            # Cache miss or forced refresh, fetch from API
            if self.config["debug_mode"]:
                print(info("Fetching workflows from API..."))
                
            self._cached_workflows = self.client.get_workflows()
            self._workflows_cached_at = now
            
            if self.config["debug_mode"]:
                if self._cached_workflows.success:
                    count = len(self._cached_workflows.data) if self._cached_workflows.data else 0
                    print(info(f"Cached {count} workflows."))
                else:
                    print(warning("Failed to cache workflows."))
        else:
            # Cache hit
            if self.config["debug_mode"]:
                print(info("Using cached workflows."))
                
        return self._cached_workflows
        
    def clear_workflow_cache(self):
        """Clear the workflow cache."""
        self._cached_workflows = None
        self._workflows_cached_at = 0
        print(success("Workflow cache cleared."))
        
    def set_workflow_cache_ttl(self, seconds):
        """Set the workflow cache TTL.
        
        Args:
            seconds: Cache TTL in seconds
        """
        try:
            ttl = int(seconds)
            if ttl < 0:
                print(error("Cache TTL must be a positive number."))
                return False
                
            self._workflow_cache_ttl = ttl
            self.config["workflow_cache_ttl"] = ttl
            self.save_config()
            
            # Format time nicely for display
            if ttl < 60:
                time_str = f"{ttl} seconds"
            elif ttl < 3600:
                minutes = ttl // 60
                time_str = f"{minutes} minute{'s' if minutes != 1 else ''}"
            else:
                hours = ttl // 3600
                time_str = f"{hours} hour{'s' if hours != 1 else ''}"
                
            print(success(f"Workflow cache time set to {time_str}."))
            return True
        except ValueError:
            print(error("Invalid value. Please enter a number."))
            return False
    
    def show_document_analysis_menu(self):
        """Show document analysis menu."""
        if not self.client:
            print(error("Client not initialized. Please configure a service account first."))
            input("Press Enter to continue...")
            return
        
        # Check if we need to fetch workflows for the first time
        is_first_load = self._cached_workflows is None
        
        if is_first_load:
            # First-time loading needs to fetch workflows - show a clear loading message
            os.system('cls' if os.name == 'nt' else 'clear')
            display_banner()
            print(title("DOCUMENT ANALYSIS"))
            print(subtitle("Initializing..."))
            print(info("Fetching available workflows for the first time..."))
            print(info("This may take a few moments, but future loads will be faster."))
            print()
            
            # Get workflows (this will cache them)
            try:
                workflows = self.get_cached_workflows()
                
                # Clear screen before showing the actual menu
                os.system('cls' if os.name == 'nt' else 'clear')
                display_banner()
            except Exception as e:
                print(error(f"Failed to get workflows: {str(e)}"))
                input("Press Enter to continue...")
                return
        else:
            # Using cached workflows
            try:
                workflows = self.get_cached_workflows()
                
                os.system('cls' if os.name == 'nt' else 'clear')
                display_banner()
            except Exception as e:
                print(error(f"Failed to get workflows: {str(e)}"))
                input("Press Enter to continue...")
                return
            
        print(title("DOCUMENT ANALYSIS"))
        print(subtitle("Select a workflow to analyze a document"))
        print()
        
        # Display available workflows
        if workflows.success and workflows.data:
            for i, workflow in enumerate(workflows.data, 1):
                workflow_key = workflow.get('workflow_key', '')
                description = workflow.get('description', 'No description')
                print(menu_option(str(i), f"{workflow_key} - {description}"))
        else:
            print(warning("No workflows available."))
        
        print()
        print(menu_option("b", "Back to Main Menu"))
        print()
        
        choice = input("Enter your choice: ").strip().lower()
        
        if choice == 'b':
            return
        
        # Try to parse choice as a number
        try:
            index = int(choice) - 1
            if 0 <= index < len(workflows.data):
                selected_workflow = workflows.data[index]
                workflow_key = selected_workflow.get('workflow_key', '')
                
                # Check if test mode is enabled
                if self.config['test_mode']:
                    print()
                    print(subtitle("Test Mode is ON. Choose a file source:"))
                    print(menu_option("1", "Enter a custom file path"))
                    print(menu_option("2", "Browse example files"))
                    print()
                    file_source = input("Enter your choice: ").strip()
                    
                    if file_source == "2":
                        file_path = self.browse_example_files()
                        if file_path is None:
                            print(warning("No file selected."))
                            input("Press Enter to continue...")
                            return
                    else:
                        file_path = input("Enter path to document file: ").strip()
                        file_path = os.path.expanduser(file_path)
                else:
                    # Ask for file path (normal mode)
                    file_path = input("Enter path to document file: ").strip()
                    file_path = os.path.expanduser(file_path)
                
                if os.path.isfile(file_path):
                    print(info(f"Analyzing document with workflow: {workflow_key}"))
                    
                    # Read file
                    with open(file_path, 'rb') as f:
                        file_data = f.read()
                    
                    # Submit for analysis
                    try:
                        result = self.client.analyze_document(
                            file_data=file_data, 
                            options={
                                'file_name': os.path.basename(file_path),
                                'analysis_type': workflow_key
                            }
                        )
                        
                        # Save UUID to recent list
                        if hasattr(result, 'uuid'):
                            uuid = result.uuid
                            self.config['recent_uuids'] = [uuid] + [u for u in self.config['recent_uuids'] if u != uuid][:9]
                            self.save_config()
                            
                            print(success(f"Document submitted successfully!"))
                            print(info(f"Job UUID: {uuid}"))
                            print()
                            print(info("You can retrieve results using this UUID."))
                            input("Press Enter to continue...")  # Wait for user to acknowledge
                            return  # Return to main menu after successful submission
                        else:
                            print(warning("Document submitted but no UUID was returned."))
                            input("Press Enter to continue...")
                            return
                    except Exception as e:
                        print(error(f"Error submitting document: {str(e)}"))
                        input("Press Enter to continue...")
                        return
                else:
                    print(error(f"File not found: {file_path}"))
                    input("Press Enter to continue...")
                    return
            else:
                print(warning("Invalid workflow selection."))
        except (ValueError, IndexError):
            print(warning("Invalid choice."))
        except Exception as e:
            print(error(f"Failed to get workflows: {str(e)}"))
        
        input("Press Enter to continue...")
    
    def show_results_menu(self):
        """Show results retrieval menu."""
        if not self.client:
            print(error("Client not initialized. Please configure a service account first."))
            input("Press Enter to continue...")
            return
        
        os.system('cls' if os.name == 'nt' else 'clear')
        display_banner()
        
        print(title("RETRIEVE RESULTS"))
        print(subtitle("Get analysis results by job UUID"))
        print()
        
        # Show recent UUIDs
        if self.config['recent_uuids']:
            print(subtitle("Recent job UUIDs:"))
            for i, uuid in enumerate(self.config['recent_uuids'], 1):
                print(menu_option(str(i), uuid))
            print()
        
        print(menu_option("n", "Enter new UUID"))
        print(menu_option("b", "Back to Main Menu"))
        print()
        
        choice = input("Enter your choice: ").strip().lower()
        
        if choice == 'b':
            return
        
        uuid = None
        
        if choice == 'n':
            uuid = input("Enter job UUID: ").strip()
        else:
            try:
                index = int(choice) - 1
                if 0 <= index < len(self.config['recent_uuids']):
                    uuid = self.config['recent_uuids'][index]
            except (ValueError, IndexError):
                print(warning("Invalid choice."))
        
        if uuid:
            try:
                print(info(f"Retrieving results for job: {uuid}"))
                
                # Get results
                result = self.client.get_results(uuid)
                
                print()
                if hasattr(result, 'status'):
                    print(f"Status: {info(result.status)}")
                
                if hasattr(result, 'results') and result.results:
                    print(success("Results retrieved successfully!"))
                    print()
                    
                    # Pretty print the results
                    print(json.dumps(result.results, indent=2))
                elif hasattr(result, 'error') and result.error:
                    print(error("Analysis error:"))
                    print(json.dumps(result.error, indent=2))
                else:
                    print(warning("No results available yet. The job may still be processing."))
            except Exception as e:
                print(error(f"Failed to retrieve results: {str(e)}"))
        
        input("Press Enter to continue...")
    
    def show_client_info(self):
        """Display client account information."""
        if not self.client:
            print(error("Client not initialized. Please configure a service account first."))
            input("Press Enter to continue...")
            return
        
        try:
            print(info("Retrieving client information..."))
            client_info = self.client.get_client_info()
            
            os.system('cls' if os.name == 'nt' else 'clear')
            display_banner()
            
            print(title("CLIENT INFORMATION"))
            print()
            
            if client_info.success and client_info.data:
                data = client_info.data
                print(f"Client ID: {info(data.get('client_id', 'Unknown'))}")
                print(f"Name: {info(data.get('name', 'Unknown'))}")
                print(f"Status: {info(data.get('status', 'Unknown'))}")
                print(f"Tenant Type: {info(data.get('tenantType', 'Unknown'))}")
                
                # Format and display creation date if available
                if 'createdAt' in data:
                    created_at = data['createdAt']
                    if isinstance(created_at, str):
                        # Try to parse and format the date
                        try:
                            from datetime import datetime
                            dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                            formatted_date = dt.strftime('%Y-%m-%d %H:%M:%S UTC')
                            print(f"Created: {info(formatted_date)}")
                        except (ValueError, AttributeError):
                            print(f"Created: {info(created_at)}")
                    else:
                        print(f"Created: {info(str(created_at))}")
                
                # Display configured workflows if available
                if 'configuredWorkflows' in data and isinstance(data['configuredWorkflows'], list):
                    print()
                    print(subtitle("Configured Workflows:"))
                    if data['configuredWorkflows']:
                        for workflow in data['configuredWorkflows']:
                            print(f"  {info(workflow)}")
                    else:
                        print(f"  {warning('No workflows configured')}")
                
                # Display features if available
                if 'features' in data and isinstance(data['features'], dict):
                    print()
                    print(subtitle("Features:"))
                    for feature_name, feature_data in data['features'].items():
                        status = success("Enabled") if feature_data.get('enabled', False) else warning("Disabled")
                        print(f"  {feature_name}: {status}")
                        
                        # Show limits if available
                        if 'limits' in feature_data and feature_data['limits']:
                            print(f"    Limits:")
                            for limit_name, limit_value in feature_data['limits'].items():
                                print(f"      {limit_name}: {info(limit_value)}")
                
                print()
                print(subtitle("Additional Information:"))
                # Display other fields that weren't specifically handled
                excluded_fields = {'client_id', 'name', 'status', 'tenantType', 'createdAt', 'features', 'configuredWorkflows'}
                other_fields = False
                for key, value in data.items():
                    if key not in excluded_fields and not isinstance(value, (dict, list)):
                        print(f"  {key}: {info(str(value))}")
                        other_fields = True
                
                if not other_fields:
                    print(f"  {info('No additional information available')}")
            else:
                print(warning("Failed to retrieve client information."))
                if hasattr(client_info, 'message') and client_info.message:
                    print(warning(f"Message: {client_info.message}"))
        except Exception as e:
            print(error(f"Error retrieving client information: {str(e)}"))
        
        print()
        input("Press Enter to continue...")
    
    def show_config_menu(self):
        """Show configuration menu."""
        os.system('cls' if os.name == 'nt' else 'clear')
        display_banner()
        
        # Check if default key exists
        default_key_path = os.path.join(DEFAULT_KEY_DIR, SERVICE_ACCOUNT_KEY_NAME)
        default_key_exists = os.path.isfile(default_key_path)
        
        print(title("ACCOUNT & CONFIGURATION"))
        print(subtitle("Manage service account and API settings"))
        print()
        
        # Current settings
        print(subtitle("Current Settings:"))
        print(f"Service Account: {info(self.config['service_account_path'] or 'Not configured')}")
        print(f"API Endpoint: {info(self.config['api_endpoint'])}")
        print(f"Default Key Location: {success('Found') if default_key_exists else warning('Not found')} ({default_key_path})")
        
        # Format workflow cache TTL for display
        cache_ttl = self.config.get("workflow_cache_ttl", 1200)
        if cache_ttl < 60:
            cache_str = f"{cache_ttl} seconds"
        elif cache_ttl < 3600:
            minutes = cache_ttl // 60
            cache_str = f"{minutes} minute{'s' if minutes != 1 else ''}"
        else:
            hours = cache_ttl // 3600
            cache_str = f"{hours} hour{'s' if hours != 1 else ''}"
        print(f"Workflow Cache Time: {info(cache_str)}")
        print()
        
        print(menu_option("1", "Set Service Account Path"))
        if default_key_exists:
            print(menu_option("2", "Use Default Service Account"))
        print(menu_option("3", "Setup Default Service Account Location"))
        print(menu_option("4", "Set API Endpoint"))
        print(menu_option("5", "Test Authentication"))
        print(menu_option("6", "Get Client Info"))
        print(menu_option("7", "Clear Recent UUIDs"))
        print(menu_option("8", "Clear Workflow Cache"))
        print(menu_option("9", "Set Workflow Cache Time"))
        print()
        print(menu_option("b", "Back to Main Menu"))
        print()
        
        choice = input("Enter your choice: ").strip().lower()
        
        if choice == 'b':
            return
        elif choice == '1':
            service_account_path = input("Enter path to service account JSON file: ").strip()
            if service_account_path:
                service_account_path = os.path.expanduser(service_account_path)
                if os.path.isfile(service_account_path):
                    try:
                        # Test the service account
                        test_client = VisionFi(
                            service_account_path=service_account_path,
                            api_endpoint=self.config["api_endpoint"]
                        )
                        
                        # Update config
                        self.config["service_account_path"] = service_account_path
                        self.save_config()
                        
                        # Update client
                        self.client = test_client
                        
                        print(success("Service account updated successfully!"))
                    except Exception as e:
                        print(error(f"Failed to initialize client with new service account: {str(e)}"))
                else:
                    print(error(f"File not found: {service_account_path}"))
        elif choice == '2' and default_key_exists:
            try:
                # Test the default service account
                test_client = VisionFi(
                    service_account_path=default_key_path,
                    api_endpoint=self.config["api_endpoint"]
                )
                
                # Update config
                self.config["service_account_path"] = default_key_path
                self.save_config()
                
                # Update client
                self.client = test_client
                
                print(success("Using default service account successfully!"))
            except Exception as e:
                print(error(f"Failed to initialize client with default service account: {str(e)}"))
        elif choice == '3':
            print(subtitle("\nSetting up default service account location:"))
            print(info(f"Default location: {DEFAULT_KEY_DIR}"))
            print(info(f"Default filename: {SERVICE_ACCOUNT_KEY_NAME}"))
            print()
            
            # Create directory if it doesn't exist
            os.makedirs(DEFAULT_KEY_DIR, exist_ok=True)
            
            print(subtitle("You have two options:"))
            print("1. Copy an existing service account file to the default location")
            print("2. Manually copy your service account JSON to the default location")
            print()
            
            setup_choice = input("Choose an option (1/2): ").strip()
            
            if setup_choice == '1':
                existing_path = input("Enter path to your existing service account JSON file: ").strip()
                if existing_path:
                    existing_path = os.path.expanduser(existing_path)
                    if os.path.isfile(existing_path):
                        try:
                            # Create the directory if it doesn't exist
                            os.makedirs(os.path.dirname(default_key_path), exist_ok=True)
                            
                            # Copy the file
                            import shutil
                            shutil.copy2(existing_path, default_key_path)
                            
                            # Test the service account
                            test_client = VisionFi(
                                service_account_path=default_key_path,
                                api_endpoint=self.config["api_endpoint"]
                            )
                            
                            # Update config
                            self.config["service_account_path"] = default_key_path
                            self.save_config()
                            
                            # Update client
                            self.client = test_client
                            
                            print(success("Service account copied and configured successfully!"))
                        except Exception as e:
                            print(error(f"Failed to setup default service account: {str(e)}"))
                    else:
                        print(error(f"File not found: {existing_path}"))
            else:
                print()
                print(subtitle("Please follow these steps:"))
                print(f"1. The directory has been created: {DEFAULT_KEY_DIR}")
                print(f"2. Copy your service account JSON file to this directory")
                print(f"3. Rename the file to: {SERVICE_ACCOUNT_KEY_NAME}")
                print()
                print(info("After completing these steps, select option 2 from the menu to use the default service account."))
        elif choice == '4':
            current = self.config["api_endpoint"]
            new_endpoint = input(f"Enter new API endpoint [{current}]: ").strip()
            
            if new_endpoint:
                try:
                    # Update config
                    self.config["api_endpoint"] = new_endpoint
                    self.save_config()
                    
                    # Re-initialize client
                    if self.client and self.config["service_account_path"]:
                        self.client = VisionFi(
                            service_account_path=self.config["service_account_path"],
                            api_endpoint=new_endpoint
                        )
                    
                    print(success("API endpoint updated successfully!"))
                except Exception as e:
                    print(error(f"Failed to update API endpoint: {str(e)}"))
        elif choice == '5':
            if not self.client:
                print(error("Client not initialized. Please configure a service account first."))
            else:
                try:
                    auth_result = self.client.verify_auth()
                    if auth_result.success:
                        print(success("Authentication successful!"))
                    else:
                        print(error("Authentication failed!"))
                        if hasattr(auth_result, 'message'):
                            print(error(f"Message: {auth_result.message}"))
                except Exception as e:
                    print(error(f"Authentication error: {str(e)}"))
        elif choice == '6':
            self.show_client_info()
        elif choice == '7':
            confirm = input("Are you sure you want to clear recent UUIDs? (y/n): ").strip().lower()
            if confirm == 'y':
                self.config['recent_uuids'] = []
                self.save_config()
                print(success("Recent UUIDs cleared."))
        elif choice == '8':
            confirm = input("Are you sure you want to clear the workflow cache? (y/n): ").strip().lower()
            if confirm == 'y':
                self.clear_workflow_cache()
        elif choice == '9':
            current_ttl = self.config.get("workflow_cache_ttl", 1200)
            
            # Format current TTL for display
            if current_ttl < 60:
                current_str = f"{current_ttl} seconds"
            elif current_ttl < 3600:
                minutes = current_ttl // 60
                current_str = f"{minutes} minute{'s' if minutes != 1 else ''}"
            else:
                hours = current_ttl // 3600
                current_str = f"{hours} hour{'s' if hours != 1 else ''}"
            
            print(f"Current workflow cache time: {current_str}")
            print(subtitle("Enter new cache time:"))
            print("Examples: 30s, 10m, 2h")
            
            # Get new TTL setting
            new_ttl_str = input("New cache time: ").strip().lower()
            
            # Parse input
            if new_ttl_str.endswith('s'):
                try:
                    seconds = int(new_ttl_str[:-1])
                    self.set_workflow_cache_ttl(seconds)
                except ValueError:
                    print(error("Invalid format. Examples: 30s, 10m, 2h"))
            elif new_ttl_str.endswith('m'):
                try:
                    minutes = int(new_ttl_str[:-1])
                    self.set_workflow_cache_ttl(minutes * 60)
                except ValueError:
                    print(error("Invalid format. Examples: 30s, 10m, 2h"))
            elif new_ttl_str.endswith('h'):
                try:
                    hours = int(new_ttl_str[:-1])
                    self.set_workflow_cache_ttl(hours * 3600)
                except ValueError:
                    print(error("Invalid format. Examples: 30s, 10m, 2h"))
            else:
                try:
                    seconds = int(new_ttl_str)
                    self.set_workflow_cache_ttl(seconds)
                except ValueError:
                    print(error("Invalid format. Examples: 30s, 10m, 2h"))
        
        input("Press Enter to continue...")
    
    def browse_example_files(self):
        """Browse example files directory and let the user select a file.
        
        Returns:
            str: The path to the selected file, or None if no file was selected.
        """
        current_dir = self.examples_files_dir
        
        while True:
            os.system('cls' if os.name == 'nt' else 'clear')
            display_banner()
            
            print(title("BROWSE EXAMPLE FILES"))
            if current_dir == self.examples_files_dir:
                print(subtitle("Current directory: /"))
            else:
                print(subtitle(f"Current directory: /{os.path.relpath(current_dir, self.examples_files_dir)}"))
            print()
            
            try:
                # List all items in the current directory
                items = sorted(os.listdir(current_dir))
                
                # Separate directories and files
                directories = [item for item in items if os.path.isdir(os.path.join(current_dir, item))]
                files = [item for item in items if os.path.isfile(os.path.join(current_dir, item))]
                
                # Display directories first
                if current_dir != self.examples_files_dir:
                    print(menu_option("..", "Parent Directory"))
                    
                for i, directory in enumerate(directories, 1):
                    print(menu_option(str(i), f"Directory: {directory}/"))
                
                # Display files
                for i, file in enumerate(files, len(directories) + 1):
                    print(menu_option(str(i), f"File: {file}"))
                
                if not items:
                    print(warning("No files or directories found."))
                
                print()
                print(menu_option("b", "Back to Document Analysis"))
                print()
                
                choice = input("Enter your choice: ").strip().lower()
                
                if choice == 'b':
                    return None
                elif choice == '..':
                    # Navigate to parent directory
                    if current_dir != self.examples_files_dir:
                        current_dir = os.path.dirname(current_dir)
                else:
                    try:
                        index = int(choice) - 1
                        if 0 <= index < len(directories):
                            # Navigate to subdirectory
                            current_dir = os.path.join(current_dir, directories[index])
                        elif len(directories) <= index < len(directories) + len(files):
                            # Select a file
                            file_index = index - len(directories)
                            selected_file = os.path.join(current_dir, files[file_index])
                            return selected_file
                        else:
                            print(warning("Invalid choice."))
                            input("Press Enter to continue...")
                    except ValueError:
                        print(warning("Invalid choice."))
                        input("Press Enter to continue...")
            except Exception as e:
                print(error(f"Error browsing files: {str(e)}"))
                input("Press Enter to continue...")
                return None
    
    def show_developer_menu(self):
        """Show developer tools menu."""
        os.system('cls' if os.name == 'nt' else 'clear')
        display_banner()
        
        print(title("DEVELOPER TOOLS"))
        print(subtitle("Advanced features for development and debugging"))
        print()
        
        print(menu_option("1", "Test Authentication"))
        print(menu_option("2", f"Toggle Debug Mode ({'ON' if self.config['debug_mode'] else 'OFF'})"))
        print(menu_option("3", f"Toggle Test Mode ({'ON' if self.config['test_mode'] else 'OFF'})"))
        print()
        print(menu_option("b", "Back to Main Menu"))
        print()
        
        choice = input("Enter your choice: ").strip().lower()
        
        if choice == 'b':
            return
        elif choice == '1':
            if not self.client:
                print(error("Client not initialized. Please configure a service account first."))
            else:
                try:
                    auth_result = self.client.verify_auth()
                    print(json.dumps(auth_result.__dict__, indent=2))
                except Exception as e:
                    print(error(f"Authentication error: {str(e)}"))
        elif choice == '2':
            self.config["debug_mode"] = not self.config["debug_mode"]
            self.save_config()
            print(success(f"Debug mode {'enabled' if self.config['debug_mode'] else 'disabled'}."))
        elif choice == '3':
            self.config["test_mode"] = not self.config["test_mode"]
            self.save_config()
            print(success(f"Test mode {'enabled' if self.config['test_mode'] else 'disabled'}."))
            if self.config["test_mode"]:
                print(info("You can now browse example files in the Document Analysis menu."))
        
        input("Press Enter to continue...")

def main():
    """Main entry point for VisionFi CLI."""
    parser = argparse.ArgumentParser(description="VisionFi Command Line Interface")
    
    # Main commands
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Interactive mode (default)
    parser_interactive = subparsers.add_parser("interactive", help="Run in interactive mode")
    
    # Auth commands
    parser_auth = subparsers.add_parser("auth", help="Authentication commands")
    auth_subparsers = parser_auth.add_subparsers(dest="auth_command", help="Authentication command")
    
    # Auth verify
    parser_auth_verify = auth_subparsers.add_parser("verify", help="Verify authentication")
    
    # Analyze command
    parser_analyze = subparsers.add_parser("analyze", help="Analyze a document")
    parser_analyze.add_argument("file", help="Path to document file")
    parser_analyze.add_argument("--workflow", "-w", required=True, help="Workflow key")
    
    # Results command
    parser_results = subparsers.add_parser("results", help="Get analysis results")
    parser_results.add_argument("uuid", help="Job UUID")
    
    # Parse arguments
    args = parser.parse_args()
    
    # Create CLI instance
    cli = VisionFiCLI()
    
    # Run command
    if args.command == "auth":
        if args.auth_command == "verify":
            if not cli.client:
                print(error("Client not initialized. Please configure a service account first."))
                return
            
            try:
                auth_result = cli.client.verify_auth()
                if auth_result.success:
                    print(success("Authentication successful!"))
                else:
                    print(error("Authentication failed!"))
            except Exception as e:
                print(error(f"Authentication error: {str(e)}"))
        
    
    elif args.command == "analyze":
        if not cli.client:
            print(error("Client not initialized. Please configure a service account first."))
            return
        
        try:
            file_path = os.path.expanduser(args.file)
            if not os.path.isfile(file_path):
                print(error(f"File not found: {file_path}"))
                return
            
            with open(file_path, 'rb') as f:
                file_data = f.read()
            
            result = cli.client.analyze_document(
                file_data=file_data,
                options={
                    'file_name': os.path.basename(file_path),
                    'analysis_type': args.workflow
                }
            )
            
            print(success("Document submitted successfully!"))
            print(f"Job UUID: {result.uuid}")
            
            # Save UUID to recent list
            cli.config['recent_uuids'] = [result.uuid] + [u for u in cli.config['recent_uuids'] if u != result.uuid][:9]
            cli.save_config()
        
        except Exception as e:
            print(error(f"Analysis error: {str(e)}"))
    
    elif args.command == "results":
        if not cli.client:
            print(error("Client not initialized. Please configure a service account first."))
            return
        
        try:
            result = cli.client.get_results(args.uuid)
            
            print(f"Status: {result.status}")
            
            if hasattr(result, 'results') and result.results:
                print(json.dumps(result.results, indent=2))
            elif hasattr(result, 'error') and result.error:
                print(error("Analysis error:"))
                print(json.dumps(result.error, indent=2))
            else:
                print(warning("No results available yet."))
        
        except Exception as e:
            print(error(f"Results retrieval error: {str(e)}"))
    
    else:  # Default to interactive mode
        cli.interactive_mode()

if __name__ == "__main__":
    main()