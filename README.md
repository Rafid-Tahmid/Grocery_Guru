# Project Description

A comprehensive meal planning and recipe management web application that helps users discover recipes, plan weekly meals, and generate shopping lists with real-time price comparisons from major Australian supermarkets.

## Quick Start Guide

### Prerequisites
- Node.js (version 14.0 or higher)
- MySQL (version 8.0 or higher)
- npm (Node Package Manager)

### Basic Setup

1. **Clone the repository:**
```bash
git clone https://github.com/UAdelaide/25S1_WDC_UG_Groups_12.git
cd groceryguru/Main_Project
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the application:**
```bash
npm start
```

4. **Open your browser and go to:**
```
http://localhost:8080
```

ALTERNATIVELY

1. **Start with Shell Script**
```bash
cd Main_Project/
./start.sh
```

That's it! You can now register an account and start using GroceryGuru.

## Features

### Core Functionality
- **Recipe Search**: Discover thousands of recipes using TheMealDB API
- **Recipe Management**: Save favorite recipes and view detailed cooking instructions
- **Meal Planning**: Plan your weekly meals with an interactive calendar
- **Shopping Lists**: Generate shopping lists from your meal plans
- **Price Comparison**: Compare prices between Coles and Woolworths supermarkets
- **User Accounts**: Secure registration, login, and profile management

### User Interface
- **Responsive Design**: Works on mobile, tablet, and desktop devices
- **Dark Mode**: Automatic dark mode based on system preferences
- **Search Autocomplete**: Smart search suggestions as you type
- **Recently Viewed**: Quick access to recently viewed recipes

## Project Structure

```
Main_Project/
├── public/                 # Frontend files
│   ├── index.html         # Homepage
│   ├── index.css          # Main stylesheet
│   ├── home.js            # Homepage functionality
│   ├── recipe.html        # Recipe detail page
│   ├── meal_planner.html  # Meal planning interface
│   ├── log_in.html        # Login page
│   └── ...               # Other frontend files
├── routes/                # Backend API routes
│   ├── auth.js           # Authentication
│   ├── admin.js          # Admin functionality
│   └── recipes.js        # Recipe management
├── middleware/            # Security and authentication
├── app.js                # Main server application
├── db.js                 # Database connection
├── wdc.sql               # Database schema
└── package.json          # Dependencies and scripts
```

## Technology Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Font Awesome icons
- Responsive CSS Grid and Flexbox

### Backend
- Node.js with Express.js
- MySQL database
- bcrypt for password security
- Session-based authentication

### External APIs
- TheMealDB API for recipe data
- Woolworths API for live pricing

## Known Limitations and

### Current Limitations
- **Geographic Scope**: Price comparison limited to Australian supermarkets (Coles and Woolworths)
- **Recipe Source**: Recipe availability depends on TheMealDB API

### Known Bugs

**Platform-Dependent Behavior**: The website may behave differently depending on the laptop or system environment it is run from, potentially causing inconsistent user experiences across different devices.

**Recipe Page Loading Issues**: Recipe pages occasionally fail to load properly, requiring users to refresh the page or try accessing the recipe again.

**Delayed Recipe Saving**: When saving recipes to favorites, there may be a noticeable delay before the saved recipe appears in the user's saved recipes list. The save functionality works but may not reflect immediately in the interface.

### Development Challenges Encountered

**API Rate Limiting**: TheMealDB API imposes rate limits that can cause recipe pages to fail during peak usage. We've implemented loading states and error handling to manage these failures.

**Git Collaboration**: Four-person development team experienced merge conflicts in shared files. Resolved through structured git workflow with feature branches.

**CSS Organization**: Main stylesheet grew to 75KB, making maintenance difficult. Improved through better organization and naming conventions.
## Advanced Setup

### Environment Configuration

For additional features like password reset emails, create a `.env` file:

```bash
# Database Configuration
DB_HOST=localhost
DB_USER=appuser
DB_PASSWORD=securepassword
DB_NAME=wdc

# Session Security
SESSION_SECRET=your-secure-session-secret-key

# Email Configuration (for password reset)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Application Settings
NODE_ENV=development
PORT=8080
```

### Setting Up Admin Access

To set a user as an administrator:

1. **Register a regular account first through the web interface**

2. **Connect to MySQL:**
```bash
mysql -u root -p
```

3. **Set admin privileges:**
```sql
USE wdc;
UPDATE users SET is_admin = true WHERE email_address = 'your-admin-email@example.com';
```

4. **Access admin panel at:**
```
http://localhost:8080/admin_panel.html
```

### Production Deployment

For production environments:

1. **Use the production start script:**
```bash
chmod +x start.sh
./start.sh
```

2. **Ensure secure configuration:**
   - Set strong SESSION_SECRET
   - Configure HTTPS
   - Set NODE_ENV=production
   - Use secure database credentials

## API Endpoints

### Authentication
- `POST /submit-form` - User registration and login
- `POST /logout` - User logout
- `GET /profile` - Get user profile

### Recipes
- `GET /api/recipes/:id` - Get recipe details
- `POST /api/recipes/:id/favorite` - Toggle favorite status
- `POST /api/save-recipe` - Save recipe from external API

### Meal Planning
- `GET /api/meal-plan` - Get user's meal plan
- `POST /api/meal-plan` - Add recipe to meal plan
- `DELETE /api/meal-plan` - Remove recipe from meal plan

### Shopping & Pricing
- `GET /api/ingredients/prices/:ingredient` - Get pricing data

---

**Note**: This application was developed as a web development course project demonstrating modern web technologies, secure authentication, database design, and API integration.
