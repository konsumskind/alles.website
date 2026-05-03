const CALENDAR_ID = 'primary'; // Use primary or replace with specific Calendar ID
const SHEET_ID = 'REPLACE_WITH_SHEET_ID'; // Replace with actual Google Sheet ID
const SHEET_NAME = 'Bookings';
const WORKDAY_START = 9; // 9 AM
const WORKDAY_END = 17; // 5 PM
const SLOT_DURATION_MINUTES = 45;

function doGet(e) {
  if (e.parameter.action === 'getSlots') {
    return ContentService.createTextOutput(JSON.stringify(getAvailableSlots()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput("Invalid Action").setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { firstName, lastName, address, email, phone, inviteeEmail, selectedTime } = data;
    
    // Parse the selected time
    const startTime = new Date(selectedTime);
    const endTime = new Date(startTime.getTime() + SLOT_DURATION_MINUTES * 60000);
    
    // 1. Create Calendar Event
    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    const eventTitle = `Auftragsklärung: ${firstName} ${lastName}`;
    const description = `
      Name: ${firstName} ${lastName}
      Email: ${email}
      Telefon: ${phone}
      Adresse: ${address}
      Gast: ${inviteeEmail || 'Keine'}
    `;
    
    const event = calendar.createEvent(eventTitle, startTime, endTime, {
      description: description,
      guests: [email, inviteeEmail].filter(e => e).join(','),
      sendInvites: true
    });
    
    // 2. Save to Google Sheets
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME) || SpreadsheetApp.openById(SHEET_ID).insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'First Name', 'Last Name', 'Email', 'Phone', 'Address', 'Invitee', 'Appointment Time', 'Event ID']);
    }
    sheet.appendRow([new Date(), firstName, lastName, email, phone, address, inviteeEmail || '', startTime.toISOString(), event.getId()]);
    
    // 3. Send confirmation email to the user
    const userSubject = `Bestätigung: Auftragsklärung am ${formatDate(startTime)}`;
    const userBody = `Hallo ${firstName},\n\nvielen Dank für deine Anfrage.\n\nDein Termin zur Auftragsklärung am ${formatDate(startTime)} um ${formatTime(startTime)} Uhr wurde in meinem Kalender eingetragen. Du hast dazu eine Kalendereinladung erhalten.\n\nWir hören uns bald.\n\nViele Grüße,\nJanosch Kartschall`;
    MailApp.sendEmail(email, userSubject, userBody);
    
    // 4. Send email to invitee if provided
    if (inviteeEmail) {
      const inviteeSubject = `Einladung: Auftragsklärung mit Janosch Kartschall`;
      const inviteeBody = `Hallo,\n\ndu wurdest von ${firstName} ${lastName} zu einem Auftragsklärungsgespräch mit mir am ${formatDate(startTime)} um ${formatTime(startTime)} Uhr eingeladen.\n\nEine Kalendereinladung folgt.\n\nViele Grüße,\nJanosch Kartschall`;
      MailApp.sendEmail(inviteeEmail, inviteeSubject, inviteeBody);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Booking successful" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getAvailableSlots() {
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // Start tomorrow
  const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days later
  
  const events = calendar.getEvents(startDate, endDate);
  
  const slots = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    
    for (let h = WORKDAY_START; h < WORKDAY_END; h++) {
      for (let m = 0; m < 60; m += SLOT_DURATION_MINUTES) {
        if (m + SLOT_DURATION_MINUTES > 60) continue; // Keep it simple, slots on the hour/45
        
        const slotStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0);
        const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60000);
        
        // Check if overlaps with any event
        const isFree = !events.some(event => {
          return (slotStart < event.getEndTime() && slotEnd > event.getStartTime());
        });
        
        if (isFree) {
          slots.push(slotStart.toISOString());
        }
      }
    }
  }
  return slots;
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd.MM.yyyy");
}

function formatTime(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "HH:mm");
}
