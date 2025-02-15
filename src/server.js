require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const { google } = require('googleapis');

const app = express();
app.use(express.json());
app.use(cors());

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

let events = []

// Twilio Setup
app.post('/send-sms', async (req, res) => {
    const { to, message } = req.body;
    try {
        const response = await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to
        });
        res.json({ success: true, sid: response.sid });
    } catch (error) {
        res.status(500).json({ error:error.message });
    }
});

// Google Calendar Setup
const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

app.post('/schedule-event', async (req, res) => {
    const { summary, startTime, endTime } = req.body;

    try {
        const calendar = google.calendar({ version: 'v3', auth });
        const event = await calendar.events.insert({
            auth,
            calendarId: 'primary',
            resource: {
                summary,
                start: {dateTime: startTime, timeZone: 'America/Denver' },
                end: {dateTime: endTime, timeZone: 'America/Denver' },
            }
        });
        res.json({ success: true, link: event.data.htmlLink });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/events", (req, res) => {
    try {
        const { lead_name, event_type, date_time, reminder_sent } = req.body;

        if (!lead_name || !event_type || !date_time) {
            console.log("Invalid input received:", req.body);
            return res.status(400).json({ message: "Invalid input data." });
        }

        const newEvent = { id: events.length + 1, lead_name, event_type, date_time, reminder_sent };
        events.push(newEvent);

        console.log("Event added:", newEvent);
        res.status(201).json(newEvent);
    } catch (error) {
        console.error("Error adding event:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

// Get all events
app.get("/events", (req, res) => {
    res.json(events);
});

// Delete an event
app.delete("/events/:id", (req, res) => {
    const eventId = parseInt(req.params.id);
    const eventIndex = events.findIndex(event => event.id === eventId);

    if (eventIndex === -1) {
        return res.status(404).json({ message: "Event not found." });
    }

    events.splice(eventIndex, 1);
    res.json({ success: true, message: "Event deleted."})
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));