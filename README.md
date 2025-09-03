# Mechanic's Best Friend

A comprehensive document management system designed specifically for industrial factory equipment maintenance and operations. This application provides a hierarchical navigation system for accessing technical documentation, schematics, procedures, and maintenance notes across multiple production lines.

## Application Overview

Mechanic's Best Friend serves as a centralized repository for all equipment documentation within an industrial facility. The system organizes documents by production lines, equipment types, and document categories, providing maintenance teams with quick access to critical information during troubleshooting and routine maintenance operations.

## Key Features

### Document Organization
- **Hierarchical Navigation**: Browse documentation through an intuitive tree structure organized by production lines and equipment
- **Category-Based Filing**: Documents are organized into standardized categories including Electrical Schematics, Machine Manuals, Troubleshooting Guides, PM Procedures, Recipes, Adjustment Guides, and Mechanic Notes
- **Multi-Level Access**: Navigate from high-level production line views down to specific equipment documentation

### File Management
- **Cloud Storage Integration**: Files are stored and managed through Cloudflare R2 storage with secure access controls
- **Real-Time File Counting**: View the number of folders and files at each navigation level, including totals across all subfolders
- **Upload Capabilities**: Authorized users can upload new documentation directly to the appropriate folders
- **Progressive Loading**: File lists and counts are dynamically loaded and updated when new content is added
- **Interactive File Viewers**: Built-in viewers for CAD drawings, documents, images, and specialized content types
- **Modal Interfaces**: User-friendly popup windows for viewing CAD files and technical drawings

### Technical Infrastructure
- **Cloudflare Integration**: The system connects to Cloudflare Workers for backend processing and R2 for file storage
- **Progressive Web App**: Can be installed as a desktop or mobile application for offline access
- **Role-Based Access**: Different user roles provide appropriate access levels for viewing and uploading documents
- **Session Management**: Secure authentication with persistent sessions for seamless access

## Navigation Structure

The application organizes content across several main categories:

### Production Lines
- **Line 2**: Complete documentation for production line 2 equipment including depalletizer, fillers, seamers, pasteurizer, and packaging equipment
- **Line 3**: Documentation for production line 3 with similar equipment categories plus line-specific machinery
- **Line 4**: Full documentation set for production line 4 equipment and processes

### Supporting Systems
- **Other Systems**: Documentation for facility-wide systems including steam generators, batching systems, CIP skids, chillers, air handlers, and utility equipment
- **Equipment**: General equipment documentation including VFDs, valves, pumps, and miscellaneous production support equipment

### Document Categories
Each equipment item contains organized folders for:
- Electrical Schematics
- Machine Diagrams and CAD Drawings  
- Machine Manuals
- Troubleshooting Procedures
- Preventive Maintenance (PM) Procedures
- Recipes and Process Parameters
- Adjustment Guides
- Mechanic Notes

## How to Use the Application

### Initial Access
1. Navigate to the application URL in a web browser
2. Complete the one-time initialization process to establish the connection to cloud services
3. Authenticate using your assigned credentials
4. The main navigation interface will display all available production lines and systems

### Browsing Documentation
1. **Start at the Home Screen**: View all major production lines and systems with folder and file counts
2. **Select a Production Line**: Click on any line (e.g., Line 2) to view all equipment within that line
3. **Choose Equipment**: Navigate to specific equipment (e.g., Depalletizer) to see available documentation categories
4. **Access Documents**: Select a document category to view and download available files
5. **Navigation Controls**: Use the breadcrumb navigation or Back button to return to previous levels

### Understanding File Counts
- **Items Count**: Shows the number of subfolders within the current folder
- **Files Count**: Displays the total number of files across all subfolders, providing a complete count of available documentation
- **Real-Time Updates**: Counts automatically refresh when new files are uploaded or when navigating between folders

### File Access and Downloads
- View file listings with detailed information including file names, sizes, and upload dates
- Download files directly through the browser interface
- Open supported file types (images, PDFs, documents) in an integrated viewer
- **CAD File Viewer**: Interactive modal popup for CAD drawings (.dwg, .dxf, .dwf files) with online viewing and download options
- **Mechanic Notes**: Specialized reader interface for viewing and managing maintenance notes
- **Document Viewers**: Built-in viewers for various file types including Office documents, images, and technical drawings

### CAD File Viewing
When accessing CAD drawing files (AutoCAD .dwg, .dxf, .dwf formats), the system displays a specialized modal popup featuring:
- **Centered Modal Interface**: Clean, professional popup window that focuses attention on the CAD file
- **Download with Icon**: Primary download button with intuitive download icon for offline access
- **Online CAD Viewer**: Launch external online viewer for immediate CAD file viewing without downloads
- **File Information**: Clear display of file name and format information
- **Easy Navigation**: Red close button and background click to exit the viewer and return to file listings
- **Responsive Design**: Modal adapts to different screen sizes for desktop and mobile access

## System Requirements and Setup

### Browser Compatibility
- Modern web browsers with JavaScript enabled
- Chrome, Firefox, Safari, or Edge (latest versions recommended)
- Mobile browsers supported for field access

### Network Requirements
- Internet connection required for initial setup and file access
- HTTPS connection automatically established for secure data transfer
- Cloudflare CDN provides optimized global access

### Installation Options
- **Direct Browser Access**: No installation required - access directly through web browser
- **Progressive Web App**: Install to desktop or mobile device for app-like experience
- **Offline Capabilities**: Limited offline access through service worker caching

## Getting Started

1. **Access the Application**: Open the application URL in your preferred web browser
2. **Initialize System**: Click the initialization button when prompted to establish secure connections
3. **Wait for Setup**: The system will automatically configure connections to cloud services and verify access
4. **Login**: Enter your authentication credentials when the login screen appears
5. **Begin Navigation**: Use the main interface to browse through production lines and equipment documentation

## Connectivity and Performance

The application establishes connections to Cloudflare services during initialization:
- **Cloudflare Workers**: Handle backend processing, authentication, and file operations
- **Cloudflare R2 Storage**: Provides secure, scalable file storage and retrieval
- **Content Delivery Network**: Ensures fast access to files regardless of geographic location
- **Automatic Failover**: Built-in redundancy ensures reliable access to documentation

File counts and listings are dynamically loaded from the cloud storage system, ensuring that displayed information always reflects the current state of the documentation repository. When new files are uploaded, the system automatically updates counts and file listings across all relevant navigation levels.

## Security and Access Control

- **Encrypted Connections**: All data transfers use industry-standard HTTPS encryption
- **Role-Based Permissions**: Access levels are enforced both in the application interface and at the storage level
- **Session Security**: Authentication sessions are managed securely with automatic timeout features
- **Audit Logging**: File access and upload activities are logged for security and compliance purposes

## Support and Troubleshooting

For technical support or questions about document access:
- Verify network connectivity and browser compatibility
- Clear browser cache if experiencing loading issues
- Contact system administrators for access credential issues
- Report missing documentation or broken file links through proper channels

The system is designed to provide reliable access to critical maintenance documentation, supporting efficient equipment maintenance and troubleshooting operations across the facility.