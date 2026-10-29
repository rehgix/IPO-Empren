# IPO Emprèn

Eina web per desenvolupar el projecte emprenedor de l'RA4 i l'RA5 del mòdul IPO II (Institut Miquel Biada).

- Professorat i alumnat hi entren amb el compte de Google de l'institut (@biada.net).
- Les dades es guarden a Firebase (servidors a Madrid) i s'esborren automàticament cada 15 de juliol.
- `firestore.rules`: regles de seguretat de la base de dades. Només deixen escriure l'alumnat als apartats oberts. No es publiquen amb GitHub: cal copiar-les a la consola de Firebase (Firestore Database → Regles → Publica).
