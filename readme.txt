Scrum Master Henrik, Customer Rep Carlos, Senior Developer Jakob, Junior Developer Gaute.

Task at hand: Creating a Event Planner for Student Organizations. A calendar where the various student organizations of a city can post about their events to their corresponding faculty, team or organization.  

User stories:
as a student i would like to have all my activities easily available in a calendar so i dont have to keep track myself. - EASY 2
as a student i usually miss events because they are badly advertised, i would like a notification. - EASY 3
as a student-team some of our members miss our practices because of schedule changes. - EASY 4
as a student-organization we have a lot of people showing up that haven't said they were coming, so we have a shortage of food for them. - MEDIUM 5
as an organizer, I want to create an event with details (date, time, location, description) so my members know what’s happening. 
- Medium 1
as an admin i want to approve events before they go public so inappropriate content is filtered out. - HARD 8
as an admin i want to manage student organizations so the system stays up to date. - MEDIUM 6
as an admin i want to archive past events so the calendar only shows relevant information. - HARD 9
as an student-organizer i want to edit or cancel an event so changes are reflected to students immediately. - MEDIUM 7

Ranked from EASY - HARD, and prioritized from 1-10

Use Case and Exceptions for PRIO 1

Actors: Event Organizer (primary), System (secondary)
Precondition: Organizer is logged in and has permission to create events for their organization.

E1: Missing Information
If organizer leaves mandatory fields empty, system shows an error and highlights missing fields.

E2: Invalid Date/Time
If the chosen date/time is in the past, system shows a warning and prevents saving.

E3: No Permission
If the user doesn’t have permission to post for this organization, system denies access and shows an error.