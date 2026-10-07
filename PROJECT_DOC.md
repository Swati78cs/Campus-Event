# Campus Event Management & QR Ticketing Platform

A full-stack web application for managing college events.

Students can discover events, register for them, get QR tickets, and use the QR ticket for entry. Organizers can create and manage events, assign volunteers, check attendance, view feedback, and see event analytics. Admins can manage the overall platform.

The project is built using the MERN stack and also includes Gemini AI for helping organizers create event descriptions.

---

## What This Project Does

The platform manages the complete event process:

1. Organizers create an event.
2. Students find the event.
3. Students register for the event.
4. A QR ticket is created for the registered student.
5. Volunteers scan the QR ticket at the event.
6. Attendance is recorded.
7. If the event is full, students can join a waitlist.
8. Organizers can send in-app announcements.
9. Students can give feedback after attending.
10. Eligible students can receive certificates.
11. Organizers and admins can view event analytics.

---

## Main Features

### 1. Login & User Roles

- User registration and login
- JWT-based authentication
- Secure HttpOnly cookies
- Role-based access
- Student, Organizer, Volunteer, and Admin roles
- Active/inactive user checking
- Protected backend routes

### 2. Club Management

- Create and manage clubs
- Assign organizers to clubs
- Club-based event management
- Organizer access is limited to their assigned clubs

### 3. Event Management

- Create events
- Edit events
- Publish events
- Cancel events
- Set event capacity
- Add event category
- Add venue and date/time
- Add event description
- Add target audience and highlights

### 4. Event Discovery

Students can:

- View upcoming events
- Search events
- Filter by category
- Filter by club
- View event details
- Register for available events

Draft and cancelled events are not shown in public event listings.

### 5. Event Registration

- Student registration
- Capacity checking
- Registration cancellation
- Duplicate registration prevention
- Transaction-safe registration
- Automatic seat availability calculation

### 6. QR Ticketing

After registration, students receive a QR ticket.

The QR ticket is used for:

- Identifying the registration
- Checking the ticket at the event
- Recording attendance

The QR token does not directly expose database IDs.

### 7. Volunteer Management

Organizers can:

- Assign volunteers to events
- Remove volunteers
- View event volunteers

Volunteers get access only to the events they are assigned to.

### 8. QR Attendance & Check-In

Volunteers can scan student QR tickets during the event.

The system checks:

- Whether the ticket is valid
- Whether the registration belongs to the event
- Whether the student has already checked in

Attendance can also be overridden by authorized organizers or admins when required.

### 9. Waitlist

When an event reaches its capacity:

- Students can join the waitlist
- Students are added in order
- When a seat becomes available, the first eligible student is promoted
- The process is handled using a FIFO approach

### 10. Notifications & Announcements

The platform supports in-app notifications for important event actions such as:

- Registration
- Waitlist promotion
- Attendance
- Certificates
- Event announcements

No email or SMS system is used in the current version.

### 11. Certificates

Organizers can issue certificates to eligible attendees.

The system:

- Checks event completion
- Checks attendance
- Creates a unique certificate ID
- Generates the certificate as a PDF
- Allows public certificate verification

Certificates are generated when requested instead of permanently storing PDF files.

### 12. Feedback

Students who attended an event can submit:

- Rating from 1 to 5
- Optional written feedback

Each student can submit feedback only once for an event.

Organizers and admins can view event feedback and average ratings.

### 13. Analytics

The project provides analytics for events and organizers.

Event analytics include:

- Total registrations
- Active registrations
- Cancelled registrations
- Available seats
- Capacity utilization
- Check-in rate
- Registration trends

Organizers can view analytics for their events, while admins can view platform-level analytics.

### 14. Gemini AI Event Description Generator

Organizers can use Gemini AI to create a first draft of an event description.

The organizer provides information such as:

- Event title
- Category
- Venue
- Date and time
- Target audience
- Event highlights
- Additional notes

The generated description is shown to the organizer first.

The organizer can:

- Edit it
- Regenerate it
- Discard it
- Apply it to the event description

The AI does not automatically save or publish an event.

The Gemini API key is used only on the backend and is never exposed to the frontend.

---

## User Roles

### Student

Students can:

- Register and login
- Browse events
- Search and filter events
- Register for events
- Cancel registrations
- View QR tickets
- View attendance
- Join waitlists
- Receive notifications
- Submit feedback
- View eligible certificates

### Organizer

Organizers can:

- Manage their clubs
- Create events
- Edit events
- Publish/cancel events
- Manage registrations
- Assign volunteers
- Check attendance
- Manage waitlists
- Send announcements
- View feedback
- Issue certificates
- View event analytics
- Generate event descriptions using Gemini AI

### Volunteer

Volunteers can:

- View events they are assigned to
- Scan QR tickets
- Check student attendance

Volunteer access is event-specific.

### Admin

Admins have access to platform-level management and analytics.

---

## Technology Used

### Frontend

- React
- Vite
- JavaScript
- React Router
- CSS
- Lucide Icons

### Backend

- Node.js
- Express.js
- JavaScript
- MongoDB
- Mongoose
- Zod
- bcryptjs
- JSON Web Token
- Native Fetch
- AbortController

### AI

- Google Gemini REST API

Gemini is used only for event description generation.

### Database

- MongoDB
- MongoDB Atlas

### Deployment

- Vercel for frontend
- Render for backend
- MongoDB Atlas for database

---

## Project Structure

```text
campus-event-management-qr-ticketing/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles/
│   ├── package.json
│   ├── vercel.json
│   └── .env.example
│
├── PROJECT_DOC.md
├── README.md
└── .gitignore