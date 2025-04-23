"""Example usage of the VisionFi client."""

import os
import sys
import argparse
from pathlib import Path

# Import the visionfi package (from visionfi-client distribution)
try:
    from visionfi import VisionFi
    from visionfi.exceptions import VisionFiError
except ImportError as e:
    print(f"Error importing VisionFi: {e}")
    print("Make sure you have the VisionFi client package installed:")
    print("pip install visionfi-client")
    exit(1)


def authenticate(service_account_path, api_endpoint=None):
    """Initialize and authenticate the VisionFi client.
    
    Args:
        service_account_path: Path to service account JSON file
        api_endpoint: Optional custom API endpoint
        
    Returns:
        Authenticated VisionFi client or None if authentication fails
    """
    try:
        # Initialize client with the specified service account
        kwargs = {"service_account_path": service_account_path}
        if api_endpoint:
            kwargs["api_endpoint"] = api_endpoint
            
        client = VisionFi(**kwargs)
        
        # Test authentication
        print("Testing authentication...")
        auth_result = client.verify_auth()
        if auth_result.success:
            print("Authentication successful!")
            return client
        else:
            print(f"Authentication unsuccessful: {auth_result.message}")
            return None
    except Exception as e:
        print(f"Authentication failed: {e}")
        return None


def get_client_info(client):
    """Display client account information.
    
    Args:
        client: Authenticated VisionFi client
    """
    try:
        print("\nGetting client information...")
        client_info = client.get_client_info()
        
        if client_info.success:
            # Display basic info
            print("Client Information:")
            print(f"Client ID: {client_info.data.get('client_id', 'Unknown')}")
            print(f"Name: {client_info.data.get('name', 'Unknown')}")
            print(f"Status: {client_info.data.get('status', 'Unknown')}")
            
            # Display configured workflows if available
            if 'configuredWorkflows' in client_info.data and isinstance(client_info.data['configuredWorkflows'], list):
                print("\nConfigured Workflows:")
                if client_info.data['configuredWorkflows']:
                    for workflow in client_info.data['configuredWorkflows']:
                        print(f"  {workflow}")
                else:
                    print("  No workflows configured")
            
            # Display features if available
            if 'features' in client_info.data and isinstance(client_info.data['features'], dict):
                print("\nFeatures:")
                for feature_name, feature_data in client_info.data['features'].items():
                    status = "Enabled" if feature_data.get('enabled', False) else "Disabled"
                    print(f"  {feature_name}: {status}")
                    
                    # Show limits if available
                    if 'limits' in feature_data and feature_data['limits']:
                        print(f"    Limits:")
                        for limit_name, limit_value in feature_data['limits'].items():
                            print(f"      {limit_name}: {limit_value}")
        else:
            print(f"Failed to get client info: {client_info.message}")
    except Exception as e:
        print(f"Error retrieving client information: {e}")


def list_workflows(client):
    """List available workflows for the client.
    
    Args:
        client: Authenticated VisionFi client
        
    Returns:
        List of workflows or None if retrieval fails
    """
    try:
        print("\nGetting available workflows...")
        workflows = client.get_workflows()
        
        if workflows.success and workflows.data:
            print("Available workflows:")
            for i, workflow in enumerate(workflows.data, 1):
                workflow_key = workflow.get('workflow_key', 'Unknown')
                description = workflow.get('description', 'No description')
                print(f"{i}. {workflow_key} - {description}")
            return workflows.data
        else:
            print("No workflows available or failed to retrieve workflows.")
            return None
    except Exception as e:
        print(f"Error retrieving workflows: {e}")
        return None


def analyze_document(client, file_path, workflow_key):
    """Submit a document for analysis.
    
    Args:
        client: Authenticated VisionFi client
        file_path: Path to the document file
        workflow_key: Workflow key for analysis
        
    Returns:
        Analysis job UUID or None if submission fails
    """
    try:
        # Check if file exists
        file_path = os.path.expanduser(file_path)
        if not os.path.isfile(file_path):
            print(f"File not found: {file_path}")
            return None
        
        # Read file
        print(f"\nSubmitting document '{os.path.basename(file_path)}' for analysis...")
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        # Submit for analysis
        result = client.analyze_document(
            file_data=file_data,
            options={
                'file_name': os.path.basename(file_path),
                'analysis_type': workflow_key
            }
        )
        
        print(f"Document submitted successfully!")
        print(f"Job UUID: {result.uuid}")
        return result.uuid
    
    except Exception as e:
        print(f"Error submitting document: {e}")
        return None


def get_results(client, job_uuid, poll=False, poll_interval=5000, max_attempts=12):
    """Get analysis results, optionally with polling.
    
    Args:
        client: Authenticated VisionFi client
        job_uuid: Analysis job UUID
        poll: Whether to poll for results until they're ready
        poll_interval: Polling interval in milliseconds
        max_attempts: Maximum polling attempts
        
    Returns:
        Analysis results or None if retrieval fails
    """
    try:
        print(f"\nRetrieving results for job: {job_uuid}")
        
        # Set up polling options
        kwargs = {"job_uuid": job_uuid}
        if poll:
            print(f"Polling for results (interval: {poll_interval}ms, max attempts: {max_attempts})...")
            kwargs["poll_interval"] = poll_interval
            kwargs["max_attempts"] = max_attempts
        
        # Get results
        result = client.get_results(**kwargs)
        
        print(f"Status: {result.status}")
        
        if result.results:
            print("Results retrieved successfully!")
            import json
            print(json.dumps(result.results, indent=2))
            return result.results
        elif result.error:
            print("Analysis error:")
            import json
            print(json.dumps(result.error, indent=2))
            return None
        else:
            print("No results available yet. The job may still be processing.")
            return None
    
    except Exception as e:
        print(f"Error retrieving results: {e}")
        return None


def main():
    """Main entry point for the example script."""
    parser = argparse.ArgumentParser(description="VisionFi Client Example")
    
    # Service account path is required
    parser.add_argument("--service-account", "-s", required=True,
                        help="Path to service account JSON file")
    
    # API endpoint is optional
    parser.add_argument("--api-endpoint", "-a",
                        help="Custom API endpoint URL")
    
    # Command subparsers
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # info command
    subparsers.add_parser("info", help="Get client information")
    
    # workflows command
    subparsers.add_parser("workflows", help="List available workflows")
    
    # analyze command
    analyze_parser = subparsers.add_parser("analyze", help="Analyze a document")
    analyze_parser.add_argument("file", help="Path to document file")
    analyze_parser.add_argument("--workflow", "-w", required=True,
                               help="Workflow key for analysis")
    
    # results command
    results_parser = subparsers.add_parser("results", help="Get analysis results")
    results_parser.add_argument("uuid", help="Job UUID")
    results_parser.add_argument("--poll", "-p", action="store_true",
                               help="Poll for results until they're ready")
    results_parser.add_argument("--interval", "-i", type=int, default=5000,
                               help="Polling interval in milliseconds (default: 5000)")
    results_parser.add_argument("--max-attempts", "-m", type=int, default=12,
                              help="Maximum polling attempts (default: 12)")
    
    # Parse arguments
    args = parser.parse_args()
    
    # Authenticate with service account
    client = authenticate(args.service_account, args.api_endpoint)
    if not client:
        print("Failed to authenticate. Exiting.")
        return 1
    
    # Execute command
    if args.command == "info":
        get_client_info(client)
    elif args.command == "workflows":
        list_workflows(client)
    elif args.command == "analyze":
        analyze_document(client, args.file, args.workflow)
    elif args.command == "results":
        get_results(client, args.uuid, args.poll, args.interval, args.max_attempts)
    else:
        # If no command specified, show all information
        get_client_info(client)
        list_workflows(client)
        parser.print_help()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())