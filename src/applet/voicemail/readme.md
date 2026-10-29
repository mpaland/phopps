Voicemail

Visual voicemail box for Asterisk mailboxes on the phone display.

- Folder list with message counts (`INBOX` = new, `Old`)
- Message list with date, caller and length (Cisco color phones show new/old icons)
- Details screen with Play, Delete, Call back and Next
- Play: Asterisk calls the phone (`outgoing_channel`) via a call file and plays the message,
  a played `INBOX` message is moved to `Old`
- Delete: asks for confirmation, removes all audio files and renumbers the folder gap free

Options: see the header of `index.ts`.
