# IPO Emprèn: normes del projecte

Eina web per al projecte emprenedor (RA4 i RA5) del mòdul IPO II de l'Institut Miquel Biada. La fan servir el professorat i l'alumnat (equips). L'usuari que hi treballa no sap programar: segueix les instruccions globals per explicar-li les coses.

## Com està fet
- **Tota l'aplicació és a `index.html`** (estils, menú, pàgines, revisió, notes, exemples). No hi ha cap pas de compilació: s'obre directament al navegador.
- `config.js`: configuració pública de Firebase i dominis de correu permesos (`biada.net`). No és secreta.
- `fbapi.js`: llibreria de Firebase ja empaquetada. **No s'edita.**
- `firestore.rules`: regles de seguretat de la base de dades. Si es canvien, cal avisar l'usuari que s'han de publicar a Firebase a part (no es publiquen amb el push).
- Les dades es guarden a Firebase i s'esborren cada 15 de juliol.
- Sense sessió iniciada, la web mostra un grup d'exemple amb 3 equips (Endoll Verd, Llampec, Llar Fàcil). Serveix per provar els canvis.

## Peces clau d'`index.html`
- `SECS`: els blocs i apartats del menú (ordre, títols, criteris CA, activitats i com es calcula el progrés). Per moure o afegir apartats, es toca aquí.
- `GICONS` i les regles `[data-g="..."]`: icona i colors de cada bloc. Un bloc nou necessita totes dues coses.
- `VIEWS`: quina funció dibuixa cada pàgina. `render()` és el punt central que redibuixa la pantalla.
- `role`: `'prof'` o el número de l'equip. `profTeam`: l'equip que el professor està mirant.
- `RUBRIC` i `G.acts`: rúbrica i activitats per a la nota. Si es mouen apartats, cal revisar que la nota continuï comptant bé.

## Normes de codi
- Tots els textos de la web, en **català**.
- Escriu el codi com el que ja hi ha: funcions compactes, noms curts, comentaris breus en català.
- Tot el text que ve de l'alumnat passa per `esc()` abans de posar-lo a la pàgina.
- Ha de funcionar en mòbil (hi ha regles `@media (max-width:620px)`).

## Comprovar abans de desar
- Obre `index.html` al navegador integrat i prova el canvi amb el grup d'exemple, tant amb la vista d'un equip («Veure com») com amb la del professor.
- Mira-ho també amb amplada de mòbil quan el canvi afecti el disseny.

## Git: sempre commit i push
- Després de cada canvi que funcioni: `git add`, commit amb un missatge curt en català (com els de l'historial, p. ex. «Bàner amb el nom i el logo de l'equip a la capçalera») i **push a `main` sense preguntar**.
- Abans del push, fes `git pull --rebase` (de vegades hi ha canvis nous a GitHub). Si hi ha conflictes, explica-ho a l'usuari en paraules senzilles abans de resoldre res.
- La web publicada només s'actualitza després del push.
- Si al push es baixa algun commit que no és teu, digues-ho a l'usuari.

## Token de GitHub
- El token és a `token.txt`, a l'arrel del projecte. Està a `.gitignore`: **mai s'ha de pujar, copiar, mostrar ni enganxar enlloc**.
- Per fer pull/push, passa'l amb un script `GIT_ASKPASS` (usuari `x-access-token`, contrasenya = contingut de `token.txt`) i `-c credential.helper=`. No el posis mai dins de l'URL del remot.
