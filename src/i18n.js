// OhmNote — translations (English, Hungarian).
// tr('key', { vars }) returns the current language's string, falling back to English.
// A value may be a function of the vars (used for plurals).
'use strict';

const LANGS = { en: 'English', hu: 'Magyar' };
let LANG = 'en';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const STR = {
  en: {
    // top bar
    'tool.select': 'Select & move (V)',
    'tool.hand': 'Pan (H) — or hold Space / middle mouse',
    'tool.wire': 'Wire (W)',
    'tool.pen': 'Pen — freehand sketch (P)',
    'tool.shape': 'Shapes — box, ellipse, line, arrow (S)',
    'tool.text': 'Text (T)',
    'tool.eraser': 'Eraser — removes sketches & shapes (E)',
    'fmt.bold': 'Bold (Ctrl+B)', 'fmt.italic': 'Italic (Ctrl+I)', 'fmt.underline': 'Underline (Ctrl+U)',
    'fmt.strike': 'Strikethrough', 'fmt.h1': 'Heading 1', 'fmt.h2': 'Heading 2', 'fmt.p': 'Paragraph',
    'fmt.ul': 'Bullet list', 'fmt.ol': 'Numbered list', 'fmt.code': 'Inline code', 'fmt.pre': 'Code block',
    'fmt.red': 'Red text', 'fmt.amber': 'Amber text', 'fmt.green': 'Green text', 'fmt.blue': 'Blue text',
    'fmt.hl': 'Highlight', 'fmt.clear': 'Clear formatting', 'fmt.chars': 'Insert symbol (Ω, µ, ±, …)',
    'top.undo': 'Undo (Ctrl+Z)', 'top.redo': 'Redo (Ctrl+Y)',
    'top.zoomOut': 'Zoom out (-)', 'top.zoomReset': 'Reset to 100%', 'top.zoomIn': 'Zoom in (+)', 'top.fit': 'Fit page to screen (0)',
    'top.bom': 'BOM', 'top.bomTitle': 'Parts list / BOM (B)',
    'top.export': 'Export', 'top.settings': 'Settings (Ctrl+,)', 'top.theme': 'Light / dark', 'top.right': 'Toggle side panel (])', 'top.lang': 'Language',
    // left panel
    'left.projects': 'Projects', 'left.import': 'Import a .ohm project', 'left.scan': 'Notebook photos → book', 'top.book': 'Read as book', 'top.menu': 'Projects and parts', 'top.account': 'Account and sync', 'left.newProject': 'New project (Ctrl+Shift+N)',
    'left.components': 'Components', 'left.search': 'Search parts…', 'lib.none': 'No parts match',
    'proj.actions': 'Project actions', 'page.actions': 'Page actions', 'page.add': '+ Add page (Ctrl+N)',
    // right panel
    'tab.inspector': 'Inspector', 'tab.notes': 'Page notes', 'tab.calc': 'Calc', 'top.calc': 'Calculator, formulas and rules (K)', 'sc.calc': 'Calculator',
    'notes.placeholder': "Measurements, to-dos, part choices, what worked and what didn't…",
    // tools
    'shape.rect': 'Box', 'shape.ellipse': 'Ellipse', 'shape.line': 'Line', 'shape.arrow': 'Arrow',
    'opt.ink': 'Ink', 'opt.width': (v) => `Width ${v.w}`,
    'hint.select': '<b>Click</b> to select · <b>drag</b> to move · <b>Shift</b> adds · <b>corners</b> resize · <b>R</b> rotate · <b>Del</b> delete · <b>double-click</b> text to edit',
    'hint.hand': '<b>Drag</b> to pan · <b>scroll</b> to zoom',
    'hint.place': '<b>Click</b> to place · <b>R</b> rotate · <b>X</b> mirror · <b>Esc</b> to stop',
    'hint.wire': '<b>Click</b> to start, click to bend · ends on a <b>pin</b> or <b>wire</b> · <b>Esc</b> / right-click to finish',
    'hint.pen': '<b>Drag</b> to sketch · hold <b>Shift</b> for a straight line',
    'hint.shape': '<b>Drag</b> to draw · <b>Shift</b> keeps it square / at 45°',
    'hint.text': '<b>Click</b> anywhere to type · paste images straight onto the page',
    'hint.eraser': '<b>Drag</b> over sketches and shapes to erase them',
    'hint.placing': (v) => `Placing <b>${v.name}</b> · `,
    'text.resize': 'Drag to resize',
    // status
    'status.counts': (v) => `${plural(v.parts, 'part', 'parts')} · ${plural(v.wires, 'wire', 'wires')} · ${v.sketch} sketch · ${v.text} text`,
    'save.saved': 'Saved', 'save.saving': 'Saving…', 'save.failed': 'Save failed — retrying', 'save.editing': 'Editing…',
    // toasts
    'toast.noUndo': 'Nothing to undo', 'toast.noRedo': 'Nothing to redo',
    'toast.copied': (v) => `Copied ${plural(v.n, 'item', 'items')}`,
    'toast.clickText': 'Click into a text box or the page notes first',
    'toast.cantOpen': 'Could not open that project', 'toast.projExported': 'Project exported', 'toast.projImported': 'Project imported',
    'toast.pageEmpty': 'This page is empty', 'toast.imgExported': 'Image exported',
    'toast.bomExported': 'BOM exported', 'toast.bomCopied': 'BOM copied — paste it into a spreadsheet',
    // context menus
    'menu.rotate': 'Rotate', 'menu.mirror': 'Mirror', 'menu.duplicate': 'Duplicate', 'menu.copy': 'Copy', 'menu.delete': 'Delete',
    'menu.addText': 'Add text here', 'menu.paste': 'Paste', 'menu.selectAll': 'Select all', 'menu.fit': 'Fit to screen',
    'menu.open': 'Open', 'menu.rename': 'Rename', 'menu.addPage': 'Add page', 'menu.exportProject': 'Export project (.ohm)…',
    'menu.deleteProject': 'Delete project', 'menu.dupPage': 'Duplicate page', 'menu.up': 'Move up', 'menu.down': 'Move down',
    'menu.deletePage': 'Delete page',
    'menu.exportPng': 'Page as PNG image…', 'menu.bom': 'Parts list (BOM)…', 'menu.projectFile': 'Project file (.ohm)…',
    'menu.import': 'Import project…', 'menu.dataFolder': 'Open data folder',
    // inspector
    'insp.ref': 'Reference', 'insp.value': 'Value', 'insp.net': 'Net / rail name', 'insp.part': 'Part number',
    'insp.partPh': 'e.g. CF14JT10K0', 'insp.footprint': 'Package / footprint', 'insp.footprintPh': 'e.g. TH axial, 0805, TO-92',
    'insp.notes': 'Notes', 'insp.notesPh': 'Supplier, tolerance, why this part…', 'insp.inBom': 'Include in parts list (BOM)',
    'insp.rotate': 'Rotate', 'insp.mirror': 'Mirror', 'insp.delete': 'Delete', 'insp.duplicate': 'Duplicate', 'insp.pins': 'Pins',
    'insp.selection': 'Selection', 'insp.color': 'Color', 'insp.width': 'Width', 'insp.thisPage': 'This page',
    'k.comps': 'parts', 'k.wires': 'wires', 'k.strokes': 'sketches', 'k.shapes': 'shapes', 'k.texts': 'text boxes', 'k.sketches': 'sketches',
    'insp.shortcuts': 'Shortcuts',
    'sc.select': 'Select / move', 'sc.wire': 'Wire', 'sc.draw': 'Pen · Shapes · Text', 'sc.eraser': 'Eraser · Pan',
    'sc.rotate': 'Rotate · Mirror', 'sc.dup': 'Duplicate', 'sc.search': 'Search parts', 'sc.bom': 'Parts list (BOM)',
    'sc.settings': 'Settings', 'sc.newPage': 'New page', 'sc.newProject': 'New project', 'sc.pan': 'Pan', 'sc.space': 'Space', 'sc.drag': '+drag', 'sc.fit': 'Fit to screen', 'sc.panels': 'Hide panels',
    'insp.tip': 'Tip: paste a photo of your breadboard or a datasheet screenshot straight onto the page.',
    // projects
    'name.project': (v) => `Project ${v.n}`, 'name.page': (v) => `Page ${v.n}`, 'name.copy': (v) => `${v.name} (copy)`,
    'name.myProject': 'My project', 'name.imported': 'Imported project', 'name.untitledPage': 'Untitled page',
    'confirm.deleteProject': (v) => `Delete the project "${v.name}"?\n\nIt is moved to OhmNote's trash folder, so it can be recovered by hand.`,
    'confirm.deletePage': (v) => `Delete the page "${v.name}"?`,
    // BOM
    'bom.title': (v) => `Parts list · ${v.name}`, 'bom.thisPage': 'This page', 'bom.project': 'Whole project',
    'bom.qty': 'Qty', 'bom.refs': 'References', 'bom.comp': 'Component', 'bom.value': 'Value', 'bom.part': 'Part number',
    'bom.footprint': 'Footprint', 'bom.notes': 'Notes', 'bom.details': 'Details',
    'insp.props': 'Properties', 'insp.nib': 'Pen', 'insp.size': 'Size', 'insp.smaller': 'Smaller', 'insp.bigger': 'Bigger',
    'insp.stepDown': 'Previous standard value', 'insp.stepUp': 'Next standard value',
    'insp.ledR': 'Series resistor', 'insp.ledNearest': 'Nearest standard (E12)',
    'toast.badValue': 'Could not read that value. Try 4.7k, 4k7, 100n or 3V3.',
    'hint.resize': 'Drag a corner handle to resize. Hold Shift for 25% steps.',
    'bom.empty': 'No parts yet. Place components from the library on the left.<br>Power symbols, ground and net labels are left out.',
    'bom.foot': (v) => `${plural(v.rows, 'line', 'lines')} · ${plural(v.total, 'part', 'parts')} · Fill in part numbers in the Inspector`,
    'bom.copy': 'Copy', 'bom.csv': 'Export CSV…', 'bom.done': 'Done', 'bom.file': 'BOM', 'bom.csvLabel': 'CSV file',
    // sample project
    'sample.project': 'My first project', 'sample.page': 'LED blinky — getting started', 'sample.red': 'Red', 'sample.axial': 'TH axial',
    'sample.polarity': '<p><span style="color: rgb(245, 165, 36);"><b>Check polarity!</b></span> Long leg = anode (+).</p>',
    'sample.welcome': '<h1>Welcome to OhmNote</h1><p>Schematics, sketches and notes all live on the same page.</p>' +
      '<ul><li><b>Parts:</b> click one in the library (or drag it in), then click to place it. <b>R</b> rotates.</li>' +
      '<li><b>Wires (W):</b> click a pin, click to bend, click another pin to finish. Junction dots appear on their own.</li>' +
      '<li><b>Sketch (P), shapes (S), text (T)</b> for everything else. You can paste photos too.</li>' +
      '<li><b>B</b> opens the parts list. Fill in part numbers in the Inspector →</li></ul>',
    'sample.notes': '<h1>Notes</h1><p>Use this side for a running log: measurements, to-dos, what you tried.</p>' +
      '<ul><li>Measured LED current: <code>14.6 mA</code></li><li>Try a 1k resistor for a dimmer LED</li></ul>',
  },

  hu: {
    'tool.select': 'Kijelölés és mozgatás (V)',
    'tool.hand': 'Nézet mozgatása (H) — vagy Szóköz / középső egérgomb',
    'tool.wire': 'Vezeték (W)',
    'tool.pen': 'Toll — szabadkézi rajz (P)',
    'tool.shape': 'Alakzatok — téglalap, ellipszis, vonal, nyíl (S)',
    'tool.text': 'Szöveg (T)',
    'tool.eraser': 'Radír — rajzokat és alakzatokat töröl (E)',
    'fmt.bold': 'Félkövér (Ctrl+B)', 'fmt.italic': 'Dőlt (Ctrl+I)', 'fmt.underline': 'Aláhúzott (Ctrl+U)',
    'fmt.strike': 'Áthúzott', 'fmt.h1': 'Címsor 1', 'fmt.h2': 'Címsor 2', 'fmt.p': 'Bekezdés',
    'fmt.ul': 'Felsorolás', 'fmt.ol': 'Számozott lista', 'fmt.code': 'Kód a sorban', 'fmt.pre': 'Kódblokk',
    'fmt.red': 'Piros szöveg', 'fmt.amber': 'Borostyánsárga szöveg', 'fmt.green': 'Zöld szöveg', 'fmt.blue': 'Kék szöveg',
    'fmt.hl': 'Kiemelés', 'fmt.clear': 'Formázás törlése', 'fmt.chars': 'Szimbólum beszúrása (Ω, µ, ±, …)',
    'top.undo': 'Visszavonás (Ctrl+Z)', 'top.redo': 'Újra (Ctrl+Y)',
    'top.zoomOut': 'Kicsinyítés (-)', 'top.zoomReset': 'Vissza 100%-ra', 'top.zoomIn': 'Nagyítás (+)', 'top.fit': 'Oldal igazítása a képernyőhöz (0)',
    'top.bom': 'Lista', 'top.bomTitle': 'Alkatrészlista / BOM (B)',
    'top.export': 'Exportálás', 'top.settings': 'Beállítások (Ctrl+,)', 'top.theme': 'Világos / sötét', 'top.right': 'Oldalpanel ki/be (])', 'top.lang': 'Nyelv',
    'left.projects': 'Projektek', 'left.import': '.ohm projekt importálása', 'left.scan': 'Füzetfotókból könyv', 'top.book': 'Olvasás könyvként', 'top.menu': 'Projektek és alkatrészek', 'top.account': 'Fiók és szinkron', 'left.newProject': 'Új projekt (Ctrl+Shift+N)',
    'left.components': 'Alkatrészek', 'left.search': 'Alkatrész keresése…', 'lib.none': 'Nincs találat',
    'proj.actions': 'Projektműveletek', 'page.actions': 'Oldalműveletek', 'page.add': '+ Új oldal (Ctrl+N)',
    'tab.inspector': 'Tulajdonságok', 'tab.notes': 'Jegyzetek', 'tab.calc': 'Számolás', 'top.calc': 'Számológép, képletek és szabályok (K)', 'sc.calc': 'Számológép',
    'notes.placeholder': 'Mérések, teendők, alkatrész-választások, mi működött és mi nem…',
    'shape.rect': 'Téglalap', 'shape.ellipse': 'Ellipszis', 'shape.line': 'Vonal', 'shape.arrow': 'Nyíl',
    'opt.ink': 'Tinta', 'opt.width': (v) => `Vastagság: ${v.w}`,
    'hint.select': '<b>Kattintás</b>: kijelölés · <b>húzás</b>: mozgatás · <b>Shift</b>: hozzáadás · <b>sarkok</b>: méretezés · <b>R</b> forgatás · <b>Del</b> törlés · <b>dupla kattintás</b>: szöveg szerkesztése',
    'hint.hand': '<b>Húzás</b>: nézet mozgatása · <b>görgetés</b>: nagyítás',
    'hint.place': '<b>Kattintás</b>: lerakás · <b>R</b> forgatás · <b>X</b> tükrözés · <b>Esc</b>: befejezés',
    'hint.wire': '<b>Kattintás</b>: kezdés, újabb kattintás: törés · <b>lábon</b> vagy <b>vezetéken</b> magától véget ér · <b>Esc</b> / jobb klikk: befejezés',
    'hint.pen': '<b>Húzás</b>: rajzolás · <b>Shift</b> nyomva: egyenes vonal',
    'hint.shape': '<b>Húzás</b>: rajzolás · <b>Shift</b>: négyzet / 45°',
    'hint.text': '<b>Kattints</b> bárhová és írj · képet is beilleszthetsz közvetlenül az oldalra',
    'hint.eraser': '<b>Húzd</b> végig a rajzokon és alakzatokon a törléshez',
    'hint.placing': (v) => `Elhelyezés: <b>${v.name}</b> · `,
    'text.resize': 'Húzd az átméretezéshez',
    'status.counts': (v) => `${v.parts} alkatrész · ${v.wires} vezeték · ${v.sketch} rajz · ${v.text} szöveg`,
    'save.saved': 'Mentve', 'save.saving': 'Mentés…', 'save.failed': 'Mentés sikertelen — újrapróbálás', 'save.editing': 'Szerkesztés…',
    'toast.noUndo': 'Nincs mit visszavonni', 'toast.noRedo': 'Nincs mit újra végrehajtani',
    'toast.copied': (v) => `${v.n} elem másolva`,
    'toast.clickText': 'Előbb kattints egy szövegdobozba vagy az oldaljegyzetekbe',
    'toast.cantOpen': 'A projektet nem sikerült megnyitni', 'toast.projExported': 'Projekt exportálva', 'toast.projImported': 'Projekt importálva',
    'toast.pageEmpty': 'Ez az oldal üres', 'toast.imgExported': 'Kép exportálva',
    'toast.bomExported': 'Alkatrészlista exportálva', 'toast.bomCopied': 'Alkatrészlista másolva — illeszd be egy táblázatba',
    'menu.rotate': 'Forgatás', 'menu.mirror': 'Tükrözés', 'menu.duplicate': 'Duplikálás', 'menu.copy': 'Másolás', 'menu.delete': 'Törlés',
    'menu.addText': 'Szöveg ide', 'menu.paste': 'Beillesztés', 'menu.selectAll': 'Összes kijelölése', 'menu.fit': 'Igazítás a képernyőhöz',
    'menu.open': 'Megnyitás', 'menu.rename': 'Átnevezés', 'menu.addPage': 'Új oldal', 'menu.exportProject': 'Projekt exportálása (.ohm)…',
    'menu.deleteProject': 'Projekt törlése', 'menu.dupPage': 'Oldal duplikálása', 'menu.up': 'Feljebb', 'menu.down': 'Lejjebb',
    'menu.deletePage': 'Oldal törlése',
    'menu.exportPng': 'Oldal PNG képként…', 'menu.bom': 'Alkatrészlista (BOM)…', 'menu.projectFile': 'Projektfájl (.ohm)…',
    'menu.import': 'Projekt importálása…', 'menu.dataFolder': 'Adatmappa megnyitása',
    'insp.ref': 'Azonosító', 'insp.value': 'Érték', 'insp.net': 'Hálózat / tápvonal neve', 'insp.part': 'Cikkszám',
    'insp.partPh': 'pl. CF14JT10K0', 'insp.footprint': 'Tokozás / footprint', 'insp.footprintPh': 'pl. THT axiális, 0805, TO-92',
    'insp.notes': 'Megjegyzés', 'insp.notesPh': 'Beszállító, tűrés, miért ez az alkatrész…', 'insp.inBom': 'Szerepeljen az alkatrészlistában (BOM)',
    'insp.rotate': 'Forgatás', 'insp.mirror': 'Tükrözés', 'insp.delete': 'Törlés', 'insp.duplicate': 'Duplikálás', 'insp.pins': 'Lábak',
    'insp.selection': 'Kijelölés', 'insp.color': 'Szín', 'insp.width': 'Vastagság', 'insp.thisPage': 'Ez az oldal',
    'k.comps': 'alkatrész', 'k.wires': 'vezeték', 'k.strokes': 'rajz', 'k.shapes': 'alakzat', 'k.texts': 'szövegdoboz', 'k.sketches': 'rajz',
    'insp.shortcuts': 'Billentyűparancsok',
    'sc.select': 'Kijelölés / mozgatás', 'sc.wire': 'Vezeték', 'sc.draw': 'Toll · Alakzatok · Szöveg', 'sc.eraser': 'Radír · Nézet mozgatása',
    'sc.rotate': 'Forgatás · Tükrözés', 'sc.dup': 'Duplikálás', 'sc.search': 'Alkatrész keresése', 'sc.bom': 'Alkatrészlista (BOM)',
    'sc.settings': 'Beállítások', 'sc.newPage': 'Új oldal', 'sc.newProject': 'Új projekt', 'sc.pan': 'Nézet mozgatása', 'sc.space': 'Szóköz', 'sc.drag': '+húzás', 'sc.fit': 'Igazítás a képernyőhöz', 'sc.panels': 'Panelek elrejtése',
    'insp.tip': 'Tipp: a próbapanelről készült fotót vagy egy adatlap képernyőképét közvetlenül beillesztheted az oldalra.',
    'name.project': (v) => `${v.n}. projekt`, 'name.page': (v) => `${v.n}. oldal`, 'name.copy': (v) => `${v.name} (másolat)`,
    'name.myProject': 'Saját projekt', 'name.imported': 'Importált projekt', 'name.untitledPage': 'Névtelen oldal',
    'confirm.deleteProject': (v) => `Törlöd a(z) „${v.name}” projektet?\n\nAz OhmNote kukamappájába kerül, így kézzel visszaállítható.`,
    'confirm.deletePage': (v) => `Törlöd a(z) „${v.name}” oldalt?`,
    'bom.title': (v) => `Alkatrészlista · ${v.name}`, 'bom.thisPage': 'Ez az oldal', 'bom.project': 'Teljes projekt',
    'bom.qty': 'Db', 'bom.refs': 'Azonosítók', 'bom.comp': 'Alkatrész', 'bom.value': 'Érték', 'bom.part': 'Cikkszám',
    'bom.footprint': 'Tokozás', 'bom.notes': 'Megjegyzés', 'bom.details': 'Részletek',
    'insp.props': 'Tulajdonságok', 'insp.nib': 'Toll', 'insp.size': 'Méret', 'insp.smaller': 'Kisebb', 'insp.bigger': 'Nagyobb',
    'insp.stepDown': 'Előző szabványos érték', 'insp.stepUp': 'Következő szabványos érték',
    'insp.ledR': 'Előtét-ellenállás', 'insp.ledNearest': 'Legközelebbi szabványos (E12)',
    'toast.badValue': 'Ezt az értéket nem sikerült értelmezni. Próbáld így: 4.7k, 4k7, 100n vagy 3V3.',
    'hint.resize': 'Méretezéshez húzd a sarokfogantyút. Shift-tel 25%-os lépésekben.',
    'bom.empty': 'Még nincs alkatrész. Helyezz el alkatrészeket a bal oldali könyvtárból.<br>A tápszimbólumok, a föld és a hálózatcímkék nem szerepelnek a listában.',
    'bom.foot': (v) => `${v.rows} sor · ${v.total} alkatrész · A cikkszámokat a Tulajdonságok panelen adhatod meg`,
    'bom.copy': 'Másolás', 'bom.csv': 'CSV exportálása…', 'bom.done': 'Kész', 'bom.file': 'Alkatrészlista', 'bom.csvLabel': 'CSV fájl',
    'sample.project': 'Első projektem', 'sample.page': 'LED áramkör — első lépések', 'sample.red': 'Piros', 'sample.axial': 'THT axiális',
    'sample.polarity': '<p><span style="color: rgb(245, 165, 36);"><b>Figyelj a polaritásra!</b></span> A hosszabb láb az anód (+).</p>',
    'sample.welcome': '<h1>Üdv az OhmNote-ban!</h1><p>Kapcsolási rajzok, vázlatok és jegyzetek, mind egy oldalon.</p>' +
      '<ul><li><b>Alkatrészek:</b> kattints egyre a könyvtárban (vagy húzd be), majd kattints a lerakáshoz. Az <b>R</b> forgat.</li>' +
      '<li><b>Vezetékek (W):</b> kattints egy lábra, kattintással törd meg, majd kattints egy másik lábra a befejezéshez. A csomópontok maguktól megjelennek.</li>' +
      '<li><b>Toll (P), alakzatok (S), szöveg (T)</b> minden máshoz. Fotót is beilleszthetsz.</li>' +
      '<li>A <b>B</b> megnyitja az alkatrészlistát. A cikkszámokat a Tulajdonságok panelen adhatod meg →</li></ul>',
    'sample.notes': '<h1>Jegyzetek</h1><p>Ide vezetheted a munkanaplót: mérések, teendők, amit kipróbáltál.</p>' +
      '<ul><li>Mért LED-áram: <code>14.6 mA</code></li><li>Halványabb LED-hez próbálj 1k-s ellenállást</li></ul>',
  },
};

const SYMBOL_NAMES_HU = {
  resistor: 'Ellenállás', resistor_iec: 'Ellenállás (IEC)', potentiometer: 'Potméter', thermistor: 'Termisztor',
  capacitor: 'Kondenzátor', cap_pol: 'Elektrolit kondi', inductor: 'Tekercs', crystal: 'Kvarc', fuse: 'Biztosíték',
  transformer: 'Trafó', diode: 'Dióda', zener: 'Zener-dióda', schottky: 'Schottky-dióda', led: 'LED',
  photodiode: 'Fotodióda', npn: 'NPN tranzisztor', pnp: 'PNP tranzisztor', nmos: 'N-MOSFET', pmos: 'P-MOSFET',
  opamp: 'Műveleti erősítő', regulator: 'Fesz. szabályzó', and: 'ÉS kapu', nand: 'NEM-ÉS kapu', or: 'VAGY kapu',
  nor: 'NEM-VAGY kapu', xor: 'KIZÁRÓ VAGY', not: 'NEM kapu', ic8: 'IC (DIP-8)', ic14: 'IC (DIP-14)', ic16: 'IC (DIP-16)',
  battery: 'Elem', vdc: 'DC forrás', vac: 'AC forrás', isrc: 'Áramforrás', vcc: 'Tápvonal', gnd: 'Föld',
  chassis: 'Testföld', netlabel: 'Hálózatcímke', conn2: 'Tüskesor 1×2', conn3: 'Tüskesor 1×3', conn4: 'Tüskesor 1×4',
  conn6: 'Tüskesor 1×6', switch: 'Kapcsoló (SPST)', spdt: 'Váltókapcsoló', button: 'Nyomógomb', relay: 'Relé',
  lamp: 'Izzó', motor: 'DC motor', speaker: 'Hangszóró', buzzer: 'Zümmer', antenna: 'Antenna', testpoint: 'Mérőpont',
};
const CATEGORY_NAMES_HU = {
  'Passive': 'Passzív', 'Semiconductor': 'Félvezetők', 'IC & Logic': 'IC és logika',
  'Sources & Power': 'Források és táp', 'Connectors & Switches': 'Csatlakozók és kapcsolók', 'Output & Misc': 'Kimenet és egyéb',
};

function tr(key, vars = {}) {
  const v = (STR[LANG] && STR[LANG][key]) ?? STR.en[key];
  if (v === undefined) return key;
  return typeof v === 'function' ? v(vars) : v;
}
const symName = (d) => (LANG === 'hu' && SYMBOL_NAMES_HU[d.id]) || d.name;
const catName = (c) => (LANG === 'hu' && CATEGORY_NAMES_HU[c]) || c;

function detectLang(saved) {
  if (saved && LANGS[saved]) return saved;
  return (navigator.language || '').toLowerCase().startsWith('hu') ? 'hu' : 'en';
}

// Static markup: data-i18n (text), data-i18n-title, data-i18n-ph (placeholder).
function applyStaticI18n() {
  document.documentElement.lang = LANG;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = tr(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = tr(el.dataset.i18nTitle);
  for (const el of document.querySelectorAll('[data-i18n-ph]')) {
    if ('placeholder' in el) el.placeholder = tr(el.dataset.i18nPh);
    else el.dataset.placeholder = tr(el.dataset.i18nPh);
  }
}
