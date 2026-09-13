# Joc dezactivat temporar

Fișierele jocului sunt păstrate aici cu structura lor originală, relativă la rădăcina proiectului. Folderul nu este o aplicație independentă: importurile originale vor funcționa după restaurare.

- `app/play`: paginile `/play`, `/play/island` și `/play/world`.
- `app/api/play`: API-ul de progres și testele sale.
- `components`, `lib`: interfața, motorul 3D, misiunile, sunetul, progresul și testele jocului.
- `public/game`: modelele și imaginile, scoase din directorul public pentru a nu mai fi servite.
- `artifacts`: sursele mascotelor, scripturile Blender și fixture-ul de testare a scenei.
- `package.json`: dependențele folosite exclusiv de joc, scoase din manifestul aplicației.
- `integration.patch`: modificările care au decuplat jocul din sidebar și din interfața comună; se pot folosi ca referință la restaurare.

Nu există rute active pentru joc sau API-ul său. TypeScript, ESLint, Vitest și scanarea Tailwind exclud `disabled/**`. Aplicația activă nu importă nimic de aici, deci codul jocului nu intră în build.

Migrarea `supabase/migrations/20260906003000_game_mission_rewards.sql` rămâne în istoricul bazei de date pentru compatibilitate cu instalările existente. Nu face parte din build-ul Next.js. Dezactivarea nu șterge progresul sau recompensele utilizatorilor și nu modifică baza de date.

## Reactivare

1. Mută directoarele `app`, `components`, `lib`, `public` și `artifacts` de aici înapoi la căile originale, îmbinându-le cu directoarele existente.
2. Readaugă dependențele din manifestul de aici în manifestul rădăcinii și actualizează lockfile-ul cu `npm install`.
3. Reintrodu integrarea din `integration.patch`: intrarea Playground în sidebar, `PlayShellBoundary`/`OutsideGame` în layout și excepția din meniul contextual.
4. Rulează `npm run check` și `npm run build`, apoi verifică paginile și API-ul de progres.

Excluderile pentru `disabled/**` pot rămâne: nu afectează fișierele mutate înapoi la căile originale.
