# Club Fine Keeper

Jeg vil lave en Bødekasse app.

Appens overordnede formål skal være, at holde styr på bødekassen i en sportsklub.



Adgange:

Der skal være forskellige former for adgange/medlemskaber i appen. Følgende skal fungere:

Administrator:

Skal kunne tilføje/fjerne bøder samt bødesatser i systemet.

Skal kunne invitere samt fjerne medlemmer fra klubben.

Skal kunne godkende/afvise indbetalinger til bødekassen.

Kan trække penge ud af systemet.



Medlem:

Kan modtage bøder.

Kan indbetale til bødekassen.





Følgende sider skal indgå i appen:

Forside for nyt medlem

Her opretter man sig som bruger i appen, og tilknytter sig sin klub via en given klubkode/invitation. Man skal kunne oprette sig via mail, Facebook, Apple eller Google.

Forside for eksisterende medlem (Hjem)

Oversigt over eget skyldigt beløb til bødekassen (saldo)

Samlet beløb for modtagne bøder

Samlet allerede indbetalt beløb

Administrator skal have en “Uddel bøde” knap, hvorfra der kan uddeles bøder til medlemmer af holdet

Oversigt over bøder inkl. beløb (Bøder)

Her skal administrator kunne tilføje samt fjerne bøder samt beløb.

Oversigt over holdets medlemmer (Hold)

Indeholder bødekassens totale saldo

Indeholder bødekassens samlede beløb for givne bøder

Indeholder bødekassens manglende samlede indbetalinger (skyldigt)

Indeholder bødekassens samlede beløb for allerede foretagne indbetalinger (indbetalt)

Indeholder en spillerliste, med alle spillere på holdet, med en oversigt over totalt givne bøder samt skyldigt beløb

Fra denne side skal administrator have en knap, som udsender en påmindelse om betaling til valgte brugere

En side med historik over alle uddelte bøder samt indbetalinger (Historik)

En side hvor hver enkelt spillet kamp kan oprettes enkeltvis, og man kan stemme på kampens spiller (MOTM)

Admin skal kunne oprette kampe

Admin skal kunne tilføje spillere til hver enkelt kamp

Admin skal kunne lukke afstemning før tid

Medlemmer som er blevet tilføjet til en given kamp, kan stemme på andre deltagere af kampen, som kampens spiller

Alle resultater skal samles i en større oversigt, hvor alle stemmer løbende bliver lagt sammen

Der skal kunne oprettes flere hold i menuen, i tilfælde af, at én klub har hold i flere rækker

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fine-box-buddy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/06b787bc-8ccf-47c4-9007-605ab08ac5d7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
