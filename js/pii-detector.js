/* ═══════════════════════════════════════════════════════════════════════════
   PII Detector — Comprehensive PII detection engine
   Supports English + Italian patterns with configurable categories
   Includes: Italian name dictionary, address patterns, and standard PII
   ═══════════════════════════════════════════════════════════════════════════ */

window.Anonymizer = window.Anonymizer || {};

(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────────────
    // Italian Name Dictionary
    // Common Italian first names (male & female) and surnames
    // Used for dictionary-based name detection without API calls
    // ─────────────────────────────────────────────────────────────────────

    const ITALIAN_FIRST_NAMES = new Set([
        // ── Male ──
        'aaron','abramo','achille','adamo','adelmo','adolfo','adriano','agostino','aimone',
        'alberto','aldo','ale','alessandr','alessandro','alessio','alfio','alfonso','alfredo',
        'alvaro','amedeo','amilcare','andrea','angelo','aniello','anselmo','antonello',
        'antonino','antonio','arcangelo','aristide','armando','arnaldo','arturo','attilio',
        'augusto','aurelio','baldo','bartolomeo','basilio','battista','benedetto','beniamino',
        'benito','bernardo','biagio','boris','bruno','calogero','camillo','carlo','carmelo',
        'carmine','cesare','christian','ciro','claudio','clemente','corrado','cosimo',
        'costantino','cristian','cristiano','damiano','damone','daniele','danilo','dante',
        'dario','davide','demetrio','diego','dino','domenico','donato','edgardo','edoardo',
        'egidio','elio','elvio','emanuele','emidio','emiliano','emilio','ennio','enrico',
        'enzo','ercole','ermanno','ernesto','ettore','eugenio','ezio','fabiano','fabio',
        'fabrizio','fausto','federico','felice','ferdinando','filippo','fiorenzo','flavio',
        'fortunato','francesco','franco','fulvio','gabriele','gaetano','gennaro','gerardo',
        'giacinto','giacomo','giampaolo','giampiero','giancarlo','gianfranco','gianluca',
        'gianluigi','gianmarco','gianni','gianpaolo','gianpiero','gilberto','gino',
        'giorgio','giov','giovanni','giuliano','giulio','giuseppe','graziano','gregorio',
        'guglielmo','guido','gustavo','iacopo','iginio','ignazio','ilario','innocenzo',
        'italo','ivan','ivano','ivo','jacopo','jonathan','lando','lauro','lazzaro',
        'leandro','leonardo','leone','leopoldo','liberato','libero','livio','lorenzo',
        'loris','luca','luciano','lucio','ludovico','luigi','manlio','manuel','marcello',
        'marco','mariano','marino','mario','massimiliano','massimo','matteo','mattia',
        'maurizio','mauro','max','michelangelo','michele','mirco','mirko','modesto',
        'moreno','nando','napoleone','natale','natalino','nazario','nereo','niccolo',
        'nicola','nicolò','nino','noel','nunzio','oliviero','omar','orazio','oreste',
        'orlando','oscar','osvaldo','ottavio','ottorino','pablo','palmiro','pancrazio',
        'paolo','pasquale','patrizio','pellegrino','peppino','pier','pierfrancesco',
        'pierluigi','piero','pietro','pio','primo','prospero','quinto',
        'raffaele','raffaello','raimondo','raniero','raoul','renato','renzo','riccardo',
        'rinaldo','rino','roberto','rocco','rodolfo','romano','romeo','romualdo',
        'rosario','ruben','ruggero','sabatino','salvatore','samuele','sandro','santino',
        'santo','saverio','sebastiano','sergio','severino','silvano','silverio','silvio',
        'simone','siro','stefano','tancredi','teodoro','terenzio','tiberio','tiziano',
        'tobia','tommaso','tonino','tullio','ubaldo','ugo','ulisse','umberto','urbano',
        'valentino','valerio','valter','vasco','vincenzo','virgilio','virginio','vito',
        'vittore','vittorio','walter','william',

        // ── Female ──
        'ada','adele','adelina','adriana','agata','agnese','alba','alberta','albina',
        'alessandra','alessia','alice','alina','allegra','amalia','amanda','ambra',
        'amelia','anastasia','angela','angelica','angelina','anita','anna','annalisa',
        'annamaria','annetta','antonia','antonietta','antonella','apollonia','arianna',
        'assunta','aurora','barbara','beatrice','benedetta','berenice','bernadette',
        'berta','bianca','bruna','brunella','camilla','carla','carlotta','carmela',
        'carmen','carolina','caterina','cecilia','celeste','chiara','cinzia','clara',
        'clarissa','claudia','clelia','clotilde','colomba','concetta','consolata',
        'cornelia','cosima','costanza','cristina','dalila','daniela','debora','deborah',
        'delia','desideria','diana','dina','dolores','domenica','donatella','dora',
        'doriana','edda','edith','edvige','elda','elena','eleonora','eliana','elisa',
        'elisabetta','elvira','emanuela','emilia','emma','enrica','erica','erminia',
        'ernesta','ester','eugenia','eva','evelina','fabiana','fabiola','fanny',
        'fatima','federica','fernanda','filomena','fiorella','fiorenza','flavia',
        'flora','fortunata','franca','francesca','fulvia','gabriella','gaia','gemma',
        'genoveffa','germana','gertrude','giada','gianna','gilda','gina','ginevra',
        'giorgia','giovanna','giselda','gisella','giulia','giuliana','giuseppa',
        'giuseppina','gloria','grazia','graziella','greta','ida','ilaria','ilda',
        'ilenia','imelda','immacolata','ines','iolanda','irene','iris','irma','isabella',
        'jessica','jolanda','katia','lara','laura','lavinia','lea','leda','letizia',
        'lia','liana','lidia','liliana','lina','linda','lisa','livia','loredana',
        'lorella','lorena','lorenza','loretta','luana','luce','lucia','luciana',
        'lucrezia','luigia','luisa','maddalena','manuela','mara','marcella','margherita',
        'maria','mariagrazia','marialuce','marialuisa','mariarosa','mariella','marina',
        'marinella','marisa','marta','martina','marzia','matilde','maura','melania',
        'melissa','michela','michelina','milena','mimma','miranda','mirella','miriam',
        'monica','morena','nadia','natalia','natalina','nella','nicoletta','nina',
        'noemi','nora','norma','nunzia','olga','olivia','ombretta','orietta','ornella',
        'orsolina','paola','patrizia','perla','petronilla','piera','pierina','pinuccia',
        'raffaella','rebecca','regina','renata','rita','roberta','romana','romina',
        'rosa','rosalba','rosalia','rosalinda','rosamaria','rosangela','rosanna',
        'rosaria','rosella','rosetta','rossana','rossella','ruth','sabina','sabrina',
        'samantha','sandra','santa','sara','saveria','selena','serena','silvana',
        'silvia','simona','simonetta','sofia','sonia','stefania','stella','susanna',
        'sveva','tamara','tania','tatiana','teresa','tina','tiziana','tommasa',
        'tonina','valentina','valeria','vanda','vanessa','vanna','vera','veronica',
        'vincenza','viola','virginia','vittoria','viviana','wanda','ylenia','zaira','zoe'
    ]);

    const ITALIAN_SURNAMES = new Set([
        'abate','accardi','accardo','acerbi','acquaviva','adamo','agnelli','aiello',
        'albanese','alberti','albini','alemagna','alfano','alfonsi','allegri','altieri',
        'amato','ambrosi','amici','amodio','andreoli','angelini','antonelli','antonini',
        'aquila','arena','argentieri','armani','arnone','ferraris',
        'baldini','baldi','barone','barbato','barbieri','barbieri','barile','barone',
        'basile','bassani','bassi','battaglia','battista','bellini','bellucci','benedetti',
        'benedetto','benetti','beni','bernardi','bernardini','berti','bertini','berto',
        'bertoli','bertolini','bettini','biaggi','biagioli','biagi','bianchi','bianchini',
        'bini','biondi','bonacci','bonaventura','bonetti','boni','bonini','borghi',
        'borrelli','bosco','bottai','brambilla','bruni','bruno','bucchi','bucci',
        'calabrese','calo','calvo','camerini','camilleri','campagna','campo','canali',
        'candela','capasso','capelli','capone','cappelli','cappellini','caputo','carbone',
        'carboni','cardi','cardinale','carli','carlini','carlo','carnevale','carocci',
        'carpentieri','carta','caruso','casagrande','casella','casini','cassano','castellani',
        'castelli','catalano','cattaneo','cavaliere','cavallaro','cavalli','ceccarelli',
        'cecchi','celani','celli','cerri','cerulli','cesari','chiarini','chiesa',
        'ciccone','cimmino','clemente','clementi','cocco','colombo','colonna','colucci',
        'como','conte','conti','coppola','corazza','corona','corsi','cortese','corti',
        'costa','costantini','costanzo','cozzi','cremonesi','cresci','crispi','croce',
        'cuomo','curci',
        'damiani','damico','daniele','de angelis','de benedetti','de carlo','de falco',
        'de filippo','de gasperi','de luca','de marco','de martino','de masi','de meo',
        'de nicola','de palma','de pasquale','de rosa','de rossi','de santis','de simone',
        'de stefano','de vita','de vito','del gaudio','della casa','di battista',
        'di benedetto','di carlo','di cesare','di cosmo','di donato','di filippo',
        'di francesco','di gioia','di giuseppe','di luca','di marco','di martino',
        'di matteo','di mauro','di maggio','di nicola','di paolo','di pasquale',
        'di pietro','di rosa','di salvo','di santo','di stefano','di tommaso',
        'donati','donini','draghi','durante',
        'esposito',
        'fabbri','fabbris','fabiani','fabris','falcone','fantini','farina','fava',
        'ferrante','ferrara','ferrari','ferraro','ferreri','ferretti','ferri','ferro',
        'ferroni','festa','fiore','fiorentini','fiorillo','fiorito','fontana','forte',
        'forti','fortunato','franceschini','franceschi','franco','franzi','frascati',
        'frassica','ferraris','fusco',
        'gabrielli','galasso','galdi','galeotti','galli','gallo','gambardella','gambini',
        'garofalo','gasparini','gatti','gentile','germani','gervasio','ghezzi','giacomelli',
        'giambrone','giannini','giannone','giordani','giordano','giorgetti','giorgi',
        'giovannelli','giovannini','giuliani','giuliano','giusti','grasso','greco',
        'grillo','grimaldi','grossi','grosso','guarino','guerra','guerrini','guglielmini',
        'guidi','iervolino',
        'innocenti','inserra',
        'la barbera','la rosa','la torre','landi','lanza','laterza','leone','leonetti',
        'lepore','liguori','lisi','lo bianco','lo giudice','lo presti','locatelli',
        'loi','lombardi','lombardo','longo','loria','lorusso','lucarelli','lucchesi',
        'luciani','lupo',
        'macri','maffei','maggi','maggio','magnani','magno','magri','maieli','manca',
        'mancini','mancuso','manfredi','manna','mantovani','manzoni','marcelli',
        'marchesi','marchetti','marchini','marchi','mariani','marini','marino','mariotti',
        'marra','martelli','martinelli','martini','martino','marzano','masci','masi',
        'massaro','mastroianni','mattei','mattioli','mauro','mazza','medici','mele',
        'meloni','menni','mercuri','messina','mete','micheli','migliorini','milani',
        'monaco','monaldi','montanari','montemurro','monti','morandi','morelli','moretti',
        'mori','moro','mosca','motta','murgia','mussi','muti',
        'napoli','napolitano','nardi','natali','negro','negri','neri','nicoli','nicolini',
        'nicolosi','nocera','novelli','nunziata',
        'oliveri','olivieri','orlandi','orsi','pace','padovano','pagani','pagano',
        'pagliarini','palma','palmieri','palombo','palumbo','pandolfi','pane','panico',
        'panzeri','papa','pappalardo','parisi','parodi','pascale','pastore','pastori',
        'pavan','pavone','pecoraro','pellegrini','pellegrino','penna','perini','perna',
        'perotti','perrone','pesce','petitti','petrini','petrucci','pezzali','piazza',
        'piccolo','pierini','pinto','pintor','pirani','pirelli','pisani','pisano',
        'pittalis','pizzi','poggi','poli','politi','ponte','pozzi','prandini','pratesi',
        'priore','proietti','pugliese','puglisi',
        'quaranta','quattrocchi',
        'ragusa','raineri','raimondi','ravelli','ravera','re','reda','reina','renzi',
        'resta','ricci','ricciardi','ricco','righi','rinaldi','riva','riviera','rizzo',
        'rocca','rocchi','romagnoli','romani','romano','romeo','ronchi','ronconi','rosati',
        'rossetti','rossi','rossini','ruggeri','ruggiero','russo','rutigliano',
        'sala','salerno','salis','salmeri','salvati','salvatore','salvi','sanna',
        'santini','santoro','santucci','sardi','sartor','sartori','scafidi','scalia',
        'scarpa','scarpelli','schirru','scotti','sebastiani','serra','serri','siciliano',
        'silvestri','simeone','simoni','sironi','sordi','sorrentino','spada','spadaro',
        'spinelli','stella','strangio','tagliaferri','tamburini','tarantino','taviani',
        'tedesco','terranova','testa','tieri','todaro','toffoli','tommasini','torelli',
        'torregrossa','torresi','torretti','tosi','tosti','tozzi','trevisan','troisi',
        'trotta','turco',
        'uberti','ugolini',
        'vacca','valentini','valenti','valli','vanini','vargiu','ventura','venturi',
        'verdi','vezzali','viale','vicari','vinci','viola','viscardi','visconti',
        'vitale','vitali','viterbo','viviani','volpe','volpi',
        'zanella','zanetti','zanini','zanon','zappa','zara','zucchi','zunino'
    ]);

    // Combine for quick lookup (lowercase)
    const ALL_NAMES = new Set([...ITALIAN_FIRST_NAMES, ...ITALIAN_SURNAMES]);

    // ─────────────────────────────────────────────────────────────────────
    // PII Detection Engine
    // ─────────────────────────────────────────────────────────────────────

    class PIIDetector {
        constructor(options = {}) {
            this.categories = {
                email: true,
                phone: true,
                ssn: true,
                codiceFiscale: true,
                iban: true,
                creditCard: true,
                date: true,
                ip: true,
                url: true,
                postalCode: true,
                personName: true,
                address: true,
                ...options.categories
            };
            this.customWords = options.customWords || [];
        }

        /**
         * Update detector configuration
         */
        configure(options) {
            if (options.categories) {
                Object.assign(this.categories, options.categories);
            }
            if (options.customWords !== undefined) {
                this.customWords = options.customWords;
            }
        }

        /**
         * Get all regex patterns for enabled categories
         */
        getPatterns() {
            const patterns = [];

            if (this.categories.email) {
                patterns.push({
                    name: 'email',
                    label: 'Email Address',
                    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
                });
            }

            if (this.categories.phone) {
                patterns.push({
                    name: 'phone',
                    label: 'Phone Number',
                    pattern: /(?:\+?\d{1,4}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{2,4}[\s\-.]?\d{2,6}(?:[\s\-.]?\d{1,4})?/g
                });
            }

            if (this.categories.ssn) {
                patterns.push({
                    name: 'ssn',
                    label: 'SSN (US)',
                    pattern: /\b\d{3}[\-\s]?\d{2}[\-\s]?\d{4}\b/g
                });
            }

            if (this.categories.codiceFiscale) {
                patterns.push({
                    name: 'codiceFiscale',
                    label: 'Codice Fiscale',
                    pattern: /\b[A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z]\b/gi
                });
            }

            if (this.categories.iban) {
                patterns.push({
                    name: 'iban',
                    label: 'IBAN',
                    pattern: /\b[A-Z]{2}\d{2}[\s]?[\dA-Z]{4}[\s]?(?:[\dA-Z]{4}[\s]?){2,7}[\dA-Z]{1,4}\b/gi
                });
            }

            if (this.categories.creditCard) {
                patterns.push({
                    name: 'creditCard',
                    label: 'Credit Card',
                    pattern: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{3,4}\b/g
                });
            }

            if (this.categories.date) {
                patterns.push({
                    name: 'date',
                    label: 'Date',
                    pattern: /\b(?:0?[1-9]|[12]\d|3[01])[\/\-\.]\s?(?:0?[1-9]|1[0-2])[\/\-\.]\s?(?:19|20)\d{2}\b|\b(?:19|20)\d{2}[\/\-\.](?:0?[1-9]|1[0-2])[\/\-\.](?:0?[1-9]|[12]\d|3[01])\b/g
                });
                patterns.push({
                    name: 'date',
                    label: 'Date (Written EN)',
                    pattern: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s*(?:19|20)\d{2}\b/gi
                });
                patterns.push({
                    name: 'date',
                    label: 'Date (Written IT)',
                    pattern: /\b\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(?:19|20)\d{2}\b/gi
                });
            }

            if (this.categories.ip) {
                patterns.push({
                    name: 'ip',
                    label: 'IP Address',
                    pattern: /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g
                });
            }

            if (this.categories.url) {
                patterns.push({
                    name: 'url',
                    label: 'URL',
                    pattern: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
                });
            }

            if (this.categories.postalCode) {
                patterns.push({
                    name: 'postalCode',
                    label: 'Postal Code (IT)',
                    pattern: /\b\d{5}\b/g
                });
                patterns.push({
                    name: 'postalCode',
                    label: 'ZIP Code (US)',
                    pattern: /\b\d{5}(?:\-\d{4})?\b/g
                });
            }

            // ── Address Detection ──
            if (this.categories.address) {
                // Italian addresses: Via/Viale/Piazza/Corso + street name + optional number
                patterns.push({
                    name: 'address',
                    label: 'Address',
                    pattern: /\b(?:Via|V\.le|Viale|Piazza|P\.zza|P\.za|Piazzale|Piazzetta|Corso|C\.so|Largo|Vicolo|Lungomare|Lungotevere|Lungoadige|Lungarno|Strada|Contrada|Borgata|Borgo|Loc\.|Località|Localita|Fraz\.|Frazione|Vico|Traversa|Salita|Discesa|Calata|Galleria|Rione|Reg\.|Regione|C\.da)\s+[A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ''.]+(?:\s+(?:dei|del|della|delle|degli|di|d'|e|le|lo|la|al|san|santo|santa|ss\.|s\.)[^\S\n]+[A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ''.]+)*(?:\s+[A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ''.]+)*(?:[,\s]+(?:n\.?\s*)?\d+[\/A-Za-z]*(?:\s*[-\/]\s*\d+)?)?/gi
                });
                // English-style addresses (number + street name + type)
                patterns.push({
                    name: 'address',
                    label: 'Address (EN)',
                    pattern: /\b\d{1,5}\s+(?:[A-Z][a-zA-Z']+\s+){1,4}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Road|Rd|Lane|Ln|Way|Court|Ct|Circle|Cir|Place|Pl|Terrace|Ter|Highway|Hwy)\.?\b/gi
                });
            }

            return patterns;
        }

        /**
         * Detect all PII in a text string
         */
        detect(text) {
            if (!text || typeof text !== 'string') return [];

            const matches = [];
            const patterns = this.getPatterns();

            // Run all regex patterns
            for (const { name, label, pattern } of patterns) {
                pattern.lastIndex = 0;
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    const value = match[0].trim();
                    if (value.length < 3) continue;
                    if (!this._validate(name, value)) continue;

                    matches.push({
                        type: name,
                        label: label,
                        value: value,
                        start: match.index,
                        end: match.index + match[0].length
                    });
                }
            }

            // ── Dictionary-Based Name Detection ──
            if (this.categories.personName) {
                this._detectNames(text, matches);
            }

            // ── Custom words ──
            if (this.customWords.length > 0) {
                for (const word of this.customWords) {
                    if (!word || word.trim().length === 0) continue;
                    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const wordPattern = new RegExp('\\b' + escaped + '\\b', 'gi');
                    let match;
                    while ((match = wordPattern.exec(text)) !== null) {
                        matches.push({
                            type: 'customWord',
                            label: 'Custom Word',
                            value: match[0],
                            start: match.index,
                            end: match.index + match[0].length
                        });
                    }
                }
            }

            // Sort by position, then by length (longer matches first)
            matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

            return this._deduplicateMatches(matches);
        }

        /**
         * Dictionary-based name detection
         * Finds words that match common Italian names/surnames
         * Only matches capitalized words to reduce false positives
         */
        _detectNames(text, matches) {
            // Strategy: find capitalized words and check against dictionary
            // Also detect consecutive capitalized words as potential full names
            const wordPattern = /\b([A-ZÀ-Ÿ][a-zà-ÿ]{1,}|[A-ZÀ-Ÿ]{2,})\b/g;
            let match;

            // Common Italian words that happen to match names — skip these
            const SKIP_WORDS = new Set([
                'con','per','del','dei','della','delle','degli','nel','nei','nella',
                'nelle','negli','sul','sui','sulla','sulle','sugli','dal','dai',
                'dalla','dalle','dagli','che','chi','come','dove','quando','quale',
                'quali','quanto','quanta','quanti','quante','non','sono','essere',
                'avere','fare','dire','dare','stare','andare','venire','potere',
                'volere','dovere','sapere','vedere','prendere','trovare','una','uno',
                'gli','alla','allo','allo','alle','agli','lor','suo','sua','suoi',
                'sue','mio','mia','miei','mie','tuo','tua','tuoi','tue','questo',
                'questa','questi','queste','quello','quella','quelli','quelle',
                'the','and','for','are','but','not','you','all','can','had','her',
                'was','one','our','out','day','had','has','his','how',
                'its','may','new','now','old','see','way','who','boy','did','get',
                'his','let','put','say','she','too','use',
                // Common document/legal terms often capitalized
                'nota','saldo','totale','importo','data','anno','mese','tipo',
                'codice','numero','sezione','comune','provincia','regione',
                'documento','fattura','ricevuta','pagamento','rata','piano',
                'contratto','articolo','comma','legge','decreto','tribunale',
                'oggetto','allegato','prot','pratica','pec','tel','fax','copia',
                // Months, days
                'gennaio','febbraio','marzo','aprile','maggio','giugno','luglio',
                'agosto','settembre','ottobre','novembre','dicembre','lunedi',
                'martedi','mercoledi','giovedi','venerdi','sabato','domenica',
                // Address prefixes (already caught by address detection)
                'via','viale','piazza','piazzale','corso','largo','vicolo','strada',
                'borgo','contrada','traversa'
            ]);

            const foundNameWords = []; // { value, start, end }

            while ((match = wordPattern.exec(text)) !== null) {
                const word = match[0];
                const lower = word.toLowerCase();

                // Skip if it's a common non-name word
                if (SKIP_WORDS.has(lower)) continue;

                // Skip very short words (2 chars or less) unless all caps
                if (word.length <= 2 && word !== word.toUpperCase()) continue;

                // Check against the name dictionary
                if (ALL_NAMES.has(lower)) {
                    foundNameWords.push({
                        value: word,
                        start: match.index,
                        end: match.index + word.length
                    });
                }
            }

            // Now, group consecutive name words into full names
            // And also add individual matches
            let i = 0;
            while (i < foundNameWords.length) {
                const current = foundNameWords[i];
                let fullName = current.value;
                let endPos = current.end;
                let j = i + 1;

                // Look ahead for consecutive name words (within gap of ~3 chars for spaces)
                while (j < foundNameWords.length) {
                    const next = foundNameWords[j];
                    const gap = next.start - endPos;

                    // Allow gap for spaces and short connectors (e.g., "di", "de", "e")
                    if (gap <= 4) {
                        const inBetween = text.substring(endPos, next.start).trim().toLowerCase();
                        // Allow spaces, and common Italian name connectors
                        if (inBetween === '' || ['di', 'de', 'e', 'la', 'lo', 'del', 'della'].includes(inBetween)) {
                            fullName = text.substring(current.start, next.end);
                            endPos = next.end;
                            j++;
                            continue;
                        }
                    }
                    break;
                }

                matches.push({
                    type: 'personName',
                    label: 'Person Name',
                    value: fullName,
                    start: current.start,
                    end: endPos
                });

                i = j; // Skip grouped words
            }
        }

        /**
         * Additional validation for specific PII types
         */
        _validate(type, value) {
            switch (type) {
                case 'phone':
                    const digits = value.replace(/\D/g, '');
                    return digits.length >= 7 && digits.length <= 15;

                case 'ssn':
                    const ssnDigits = value.replace(/\D/g, '');
                    if (ssnDigits.length !== 9) return false;
                    if (ssnDigits.startsWith('000') || ssnDigits.startsWith('666')) return false;
                    if (ssnDigits.startsWith('9')) return false;
                    return true;

                case 'creditCard':
                    return this._luhnCheck(value.replace(/\D/g, ''));

                case 'ip':
                    const parts = value.split('.');
                    if (parts.length !== 4) return false;
                    if (parts.every(p => p === '0' || p === '1')) return false;
                    return true;

                default:
                    return true;
            }
        }

        /**
         * Luhn algorithm for credit card validation
         */
        _luhnCheck(num) {
            if (num.length < 13 || num.length > 19) return false;
            let sum = 0;
            let isEven = false;
            for (let i = num.length - 1; i >= 0; i--) {
                let digit = parseInt(num[i], 10);
                if (isEven) {
                    digit *= 2;
                    if (digit > 9) digit -= 9;
                }
                sum += digit;
                isEven = !isEven;
            }
            return sum % 10 === 0;
        }

        /**
         * Remove overlapping matches, keeping the longer/earlier one
         */
        _deduplicateMatches(matches) {
            if (matches.length === 0) return matches;
            const result = [matches[0]];
            for (let i = 1; i < matches.length; i++) {
                const prev = result[result.length - 1];
                const curr = matches[i];
                if (curr.start < prev.end) {
                    if ((curr.end - curr.start) > (prev.end - prev.start)) {
                        result[result.length - 1] = curr;
                    }
                } else {
                    result.push(curr);
                }
            }
            return result;
        }

        /**
         * Replace all detected PII in text with the chosen redaction style
         */
        redactText(text, options = {}) {
            const style = options.style || 'blackbar';
            const customText = options.customText || '***';
            const detections = this.detect(text);

            if (detections.length === 0) {
                return { redactedText: text, detections: [] };
            }

            let result = '';
            let lastIndex = 0;

            for (const det of detections) {
                result += text.substring(lastIndex, det.start);
                switch (style) {
                    case 'blackbar':
                        result += '█'.repeat(det.value.length);
                        break;
                    case 'redacted':
                        result += '[REDACTED]';
                        break;
                    case 'custom':
                        result += customText;
                        break;
                    case 'remove':
                        break;
                    default:
                        result += '█'.repeat(det.value.length);
                }
                lastIndex = det.end;
            }

            result += text.substring(lastIndex);
            return { redactedText: result, detections };
        }

        /**
         * Get a summary of detections grouped by type
         */
        getSummary(detections) {
            const summary = {};
            for (const det of detections) {
                if (!summary[det.type]) {
                    summary[det.type] = { label: det.label, count: 0, samples: [] };
                }
                summary[det.type].count++;
                if (summary[det.type].samples.length < 3) {
                    summary[det.type].samples.push(det.value);
                }
            }
            return summary;
        }
    }

    // Export
    Anonymizer.PIIDetector = PIIDetector;
})();
