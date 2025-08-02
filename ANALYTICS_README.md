# Analytics Dashboard

## Overview

The Analytics Dashboard provides comprehensive business insights with real-time data visualization and reporting capabilities.

## Features

### 📊 **Real-time Analytics**
- Automatically fetches data from backend APIs
- Displays live business metrics and KPIs
- Shows data source indicator (Real-time vs Mock data)

### 📈 **Visual Charts & Graphs**
- **Sales Trends**: Line and area charts showing sales performance over time
- **Purchase Analytics**: Bar charts for purchase analysis and supplier performance
- **Product Performance**: Top-selling products and category breakdowns
- **Inventory Insights**: Stock levels and expiry tracking with color-coded alerts

### 🎯 **Key Performance Indicators (KPIs)**
- Total Sales with growth percentage
- Total Purchases with trend analysis  
- Order volume and growth metrics
- Inventory alerts for items expiring soon

### 🕐 **Flexible Time Periods**
- Last 7 days
- Last 30 days  
- Last 90 days
- Last year

### 🏷️ **Multi-tab Organization**
- **Overview**: High-level dashboard with key metrics
- **Sales**: Detailed sales analysis and trends
- **Purchases**: Purchase patterns and supplier analytics
- **Inventory**: Stock management and expiry tracking

## Backend Integration

### Real Data Sources
The analytics dashboard connects to these backend endpoints:

1. **Dashboard Summary** (`/dashboard/summary`)
   - Overall business metrics
   - Sales and purchase totals
   - Inventory counts and alerts

2. **Sales Reports** (`/reports/sales`)
   - Filtered sales data with date ranges
   - Customer and product breakdowns

3. **Inventory Reports** (`/reports/inventory`)
   - Current stock levels
   - Low stock and out-of-stock items
   - Product batch information

4. **Near Expiry Items** (`/reports/near-expiry`)
   - Items expiring within 30 days
   - Batch tracking with expiry dates

5. **Monthly Revenue** (`/reports/monthly-revenue`)
   - Daily sales breakdown
   - Payment method analysis

6. **Profit/Loss** (`/reports/profit-loss`)
   - Revenue vs cost analysis
   - Margin calculations

### Fallback System
- **Mock Data**: When backend APIs are unavailable, the system gracefully falls back to sample data
- **Data Source Indicator**: Clear visual indication of whether real or mock data is being displayed
- **Error Handling**: User-friendly error messages with retry options

## Translations

Full internationalization support:
- **English**: Complete analytics terminology
- **Arabic**: Full RTL support with localized business terms

## Usage

### Accessing Analytics
1. Navigate to `/analytics` or click "Analytics" in the Reports menu
2. Requires `view-reports` permission

### Interacting with Charts
- **Hover**: View detailed tooltips with exact values
- **Time Range**: Select different periods using the dropdown
- **Refresh**: Manual data refresh button available
- **Responsive**: Charts adapt to different screen sizes

### Monitoring Data Status
- **Green Badge**: "Real-time Data" indicates live backend connection
- **Orange Badge**: "Mock Data" indicates fallback sample data
- **Toast Notifications**: Success/error messages for data operations

## Technical Details

### Dependencies
- **Recharts**: Chart visualization library
- **React Query**: Data fetching and caching
- **Sonner**: Toast notifications
- **shadcn/ui**: Modern UI components

### Performance
- **Data Caching**: 5-minute stale time for analytics queries
- **Parallel Requests**: Multiple API calls processed simultaneously
- **Responsive Design**: Optimized for all device sizes

### Error Handling
- Graceful degradation to mock data
- User-friendly error messages  
- Automatic retry mechanisms
- Loading states with progress indicators

## Future Enhancements

- Export functionality (Excel/PDF)
- Advanced filtering options
- Custom date range selection
- Drill-down capabilities
- Real-time notifications
- Predictive analytics
- Custom dashboard layouts