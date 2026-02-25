## Getting Started

### Prerequisites

- Node.js
- npm 

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the `backend` directory and add the following:
   ```env
   PORT=3000
   EMAIL_USER=segdavid03@gmail.com
   EMAIL_PASS=khxcttvijwaxpzeh
   ```

### Development

Start the development server with hot-reloading:
```bash
npm run dev
```
The server will be running at `http://localhost:3000`.


## Email Notification Feature

The backend includes a dedicated endpoint to test email notifications for now using the GET /send-email endpoint. 

Later on, we will implement a more complex email notification system implementing a scheduler to send emails at specific times.