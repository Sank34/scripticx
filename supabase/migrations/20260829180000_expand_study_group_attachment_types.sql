-- Support common Apple, Android, camera, media, and productivity formats in
-- group attachments while keeping executable and active-web formats blocked.
update storage.buckets
set allowed_mime_types = array[
  -- Portable and device-native images.
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'image/heic', 'image/heif', 'image/tiff', 'image/bmp',
  'image/dng', 'image/x-adobe-dng',

  -- Apple/Android video formats.
  'video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm',
  'video/3gpp', 'video/3gpp2', 'video/hevc',

  -- Apple/Android audio formats.
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
  'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/flac',
  'audio/3gpp', 'audio/3gpp2', 'audio/x-caf',
  'audio/aiff', 'audio/x-aiff',

  -- Text, archives, calendar/contact exports, and ebooks.
  'application/pdf', 'text/plain', 'text/markdown', 'text/csv',
  'application/json', 'application/zip', 'application/x-zip-compressed',
  'application/rtf', 'text/rtf', 'text/calendar',
  'text/vcard', 'text/x-vcard', 'application/epub+zip',

  -- Microsoft Office and OpenDocument.
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',

  -- Apple iWork exports reported by browsers and native document pickers.
  'application/vnd.apple.pages',
  'application/vnd.apple.numbers',
  'application/vnd.apple.keynote',
  'application/x-iwork-pages-sffpages',
  'application/x-iwork-numbers-sffnumbers',
  'application/x-iwork-keynote-sffkey'
]
where id = 'study-group-attachments';
