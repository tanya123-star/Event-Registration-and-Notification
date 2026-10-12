# KASAMA Event Registration and Notification System

The central record for KASAMA events, from proposal through approval, registration, attendance, and archiving.

## Language

**Event**:
A scheduled activity that moves through draft, approval, publication, registration, attendance, and archiving in one lifecycle.
_Avoid_: Proposal (as a separate entity), Activity

**Event Officer**:
The council member who authors an Event, drives it through approval, and publishes it.
_Avoid_: Organizer, Club Officer (as author)

**Club Officer**:
A club representative who reinforces announcements to members outside the system.
_Avoid_: Event Officer, Officer (unqualified)

**Attendance**:
The observed fact that a registered participant was present at an Event at a point in time.
_Avoid_: Check-in (as a separate concept), Participation record

**Approval chain**:
The ordered list of offices that must approve an Event type before it can be published.
_Avoid_: Approval flow (as a separate concept), Sign-off chain

**Registration**:
The binding of one student to one Event holding a confirmed place.
_Avoid_: Sign-up (as a separate concept), Enrolment, Ticket

**Confirmation reference**:
The student-facing identifier for one Registration, rendered as QR or typed manually.
_Avoid_: Backup code (as a second code), QR code (as a different secret), Ticket number

**Notification**:
An in-app record addressed to a student audience, with email as a delivery layer.
_Avoid_: Announcement (as an untargeted broadcast), Email (as the record itself), SMS (as a record)

**Acknowledgement**:
A student's confirmation of receipt of an IMPORTANT Notification, recording user, notification, and timestamp.
_Avoid_: Read receipt, Officer checklist completion

**Walk-in**:
An unregistered person's presence recorded by Attendance Staff as an audited exception, counted separately from registrants.
_Avoid_: Guest registration, Late registration

**Capacity**:
The maximum number of REGISTERED participants an Event holds, enforced as a hard cap.
_Avoid_: Quota, Waitlist (no waitlist exists)

**Approver**:
An office acting through one Approval chain step to approve, reject, or request revision.
_Avoid_: Approver (as a personal account), Reviewer (unqualified)

**Student**:
A provisioned account holder who reads published Events, registers, and receives Notifications.
_Avoid_: Participant (as an account), Member (unqualified), Guest
