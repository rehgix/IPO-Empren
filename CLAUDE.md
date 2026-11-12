# IPO Emprèn: normes del projecte

Eina web per al projecte emprenedor (RA4 i RA5) del mòdul IPO II de l'Institut Miquel Biada. La fan servir el professorat i l'alumnat (equips). L'usuari que hi treballa no sap programar: segueix les instruccions globals per explicar-li les coses.

## Com està fet
- **Tota l'aplicació és a `index.html`** (estils, menú, pàgines, revisió, notes, exemples). No hi ha cap pas de compilació: s'obre directament al navegador.
- `config.js`: configuració pública de Firebase i dominis de correu permesos (`biada.net`). No és secreta.
- `fbapi.js`: llibreria de Firebase ja empaquetada. **No s'edita.** Única excepció: s'hi ha afegit `driveToken()` (permís de Google Drive per a les còpies de seguretat). Si es torna a generar, cal tornar-la a afegir.
- Còpies de seguretat (`bkView`, `bkHome`, `bkRun`, `bkRestore` a `index.html`): cada professor desa els seus grups al seu Google Drive. Sense servidor, la còpia setmanal es fa en entrar al tauler. Les còpies van sempre xifrades amb una contrasenya del professor (desada a la col·lecció `bkkeys/{correu}`, que només pot llegir ell mateix); sense contrasenya no es pot fer ni activar cap còpia. Cal tenir activada la Google Drive API al projecte de Google Cloud.
- `firestore.rules`: regles de seguretat de la base de dades. **Es publiquen soles amb el push**: la GitHub Action (`.github/workflows/firebase-hosting-merge.yml`) publica la web i, al pas «Publica les regles de Firestore», també les regles. **No cal demanar a l'usuari que les enganxi a la consola de Firebase.** Un apartat nou amb dades pròpies s'ha d'afegir a `studentEditOk` i a `dataKeysOk`, o l'alumnat no el podrà desar.
  - Després de canviar les regles, comprova amb `gh run list -R rehgix/IPO-Empren` que l'execució acaba bé. Si falla, mira el registre (`gh run view <id> --log-failed`) i explica-ho a l'usuari en paraules senzilles.
  - El compte de servei de GitHub (`github-action-…@ipo-empren.iam.gserviceaccount.com`) té el rol «Administrador de Firebase Rules». Si surt «403 The caller does not have permission», és que li falta aquest rol (IAM de Google Cloud, projecte IPO Empren).
- `firebase.json`: configuració de Firebase (hosting i ruta de les regles).
- `fonts/` i `lib/`: la lletra (Geist) i les llibreries (QR, PDF, Excel) se serveixen des de la mateixa web. **No carreguis res de servidors externs** (Google Fonts, CDN): si cal una llibreria nova, copia-la a `lib/`.
- Seguretat: les imatges de l'alumnat es posen amb `imgSrc()` i els colors amb `col()`; les dades d'equip que arriben de la xarxa passen per `shapeLike()` (a `unpackSection`).
- Les dades es guarden a Firebase i s'esborren cada 15 de juliol.
- Sense sessió iniciada, la web mostra un grup d'exemple amb 3 equips de sectors diferents (Sol a Casa, d'electricitat; LabMar, de laboratori; Al Dia, de gestoria). Serveix per provar els canvis. Els textos són frases curtes i genèriques, perquè l'alumnat no els pugui copiar. Si algú crea un grup d'exemple a la nuvolatge, queda amb l'entrada lliure tancada (`join: false`) perquè l'alumnat no hi pugui entrar mai.

## Peces clau d'`index.html`
- `SECS`: els blocs i apartats del menú (ordre, títols, criteris CA, activitats i com es calcula el progrés). Per moure o afegir apartats, es toca aquí.
- `GICONS` i les regles `[data-g="..."]`: icona i colors de cada bloc. Un bloc nou necessita totes dues coses.
- `VIEWS`: quina funció dibuixa cada pàgina. `render()` és el punt central que redibuixa la pantalla.
- `projName(t)`: el nom que es mostra de cada equip (el del projecte; si no n'hi ha, «Equip N»). Fes-lo servir en lloc de `t.name` als títols i llistes.
- `role`: `'prof'` o el número de l'equip. `profTeam`: l'equip que el professor està mirant.
- `RUBRIC` i `G.acts`: rúbrica i activitats per a la nota. Si es mouen apartats, cal revisar que la nota continuï comptant bé.

## Cicles (no tipus d'empresa)
- El grup i cada equip trien el **cicle formatiu**, no un tipus d'empresa: cada equip hi pot muntar l'empresa que vulgui. A la barra del grup només surten el cicle i el sector professional.
- Els perfils de cicle (`CICLES`, claus `c-...`) es construeixen sols a partir de `PE.SECTORS`: fan servir les pistes, els costos (`FINSEC`) i els préstecs (`OFERTES`) del primer tipus d'empresa del cicle, i els exemples d'activitats i clients de tots. Per canviar el perfil d'un cicle, canvia l'ordre o el contingut d'aquest primer tipus d'empresa.
- Els sectors antics que hi hagi guardats passen sols al seu cicle (`cicleKey`, `normSectors`).

## Normes de codi
- Tots els textos de la web, en **català**.
- Quan un text per a l'alumnat parla del docent, fes servir `PR()` (`PR('el')` → «el professor» / «la professora», també `'El'`, `'al'`, `'pel'`, `'del'`, `'n'`): es tria segons el nom de qui ha creat el grup o l'opció de «Configuració».
- Alumnat: en entrar veu una finestra amb el que ha de millorar i el que falta enviar (`stuWelcome`), i una campaneta amb l'historial de comentaris (`bellUpdate`, `notifs`). Cada canvi de revisió del professor queda a `review[apartat].log` (`revLog`).
- Escriu el codi com el que ja hi ha: funcions compactes, noms curts, comentaris breus en català.
- Tot el text que ve de l'alumnat passa per `esc()` abans de posar-lo a la pàgina.
- Ha de funcionar en mòbil (hi ha regles `@media (max-width:620px)`).

## Comprovar abans de desar
- Obre `index.html` al navegador integrat i prova el canvi amb el grup d'exemple, tant amb la vista d'un equip («Veure com») com amb la del professor.
- Mira-ho també amb amplada de mòbil quan el canvi afecti el disseny.

## Revisió automàtica
- `tests/smoke.cjs` obre totes les pàgines (grup d'exemple i tauler amb un Firebase de mentida, `tests/mock-fb.js`) en ordinador i mòbil, i falla si hi ha errors de programa, pàgines que se surten de la pantalla, pàgines buides o peticions a servidors externs.
- S'executa sola a GitHub abans de publicar: **si falla, la web no es publica**. Passa-la abans del push amb `node tests/smoke.cjs` i, després del push, comprova amb `gh run list -R rehgix/IPO-Empren` que tot ha anat bé.
- Si afegeixes una pàgina o una ruta nova amb sessió, afegeix-la a la llista de `tests/smoke.cjs`.

## Git: sempre commit i push
- Després de cada canvi que funcioni: `git add`, commit amb un missatge curt en català (com els de l'historial, p. ex. «Bàner amb el nom i el logo de l'equip a la capçalera») i **push a `main` sense preguntar**.
- Abans del push, fes `git pull --rebase` (de vegades hi ha canvis nous a GitHub). Si hi ha conflictes, explica-ho a l'usuari en paraules senzilles abans de resoldre res.
- La web publicada només s'actualitza després del push.
- Si al push es baixa algun commit que no és teu, digues-ho a l'usuari.

## Token de GitHub
- El token és a `token.txt`, a l'arrel del projecte. Està a `.gitignore`: **mai s'ha de pujar, copiar, mostrar ni enganxar enlloc**.
- Per fer pull/push, passa'l amb un script `GIT_ASKPASS` (usuari `x-access-token`, contrasenya = contingut de `token.txt`) i `-c credential.helper=`. No el posis mai dins de l'URL del remot.

## Com actuar
- Abans de llegir un arxiu semcer, busca amb grep i llegeix només el que necessitis.
- Per explorar el projecte, fes servir un subagent i porta'm només el resum.
- Mostra'm el diff, no l'arxiu complet.
- No repeteixis el que ja hem decidit en aquesta sessió.
- Si canviem de tasca, proposa /compact o una sessió nova.
- Respostes curtes por defecte.
