import { Plugin, Modal, setIcon, Editor } from 'obsidian';

const API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const LONGEST_WORD = 50;
const DICTIONARY_DEPTH = 5;

type ApiDefinitions = {
    definition: string;
};

type ApiMeanings = {
    partOfSpeech: string;
    definitions: ApiDefinitions[];
};

type ApiWord = {
    meanings: ApiMeanings[];
};

type ApiResponse = ApiWord[];

type Definition = {
    partOfSpeech?: string;
    definition: string;
};

const getCountText = (i: number, size: number) => `${i + 1}/${size}`;

const isValidSelection = (selection: string) =>
    selection.length > 0 && selection.length < LONGEST_WORD;

const isValidResponse = (resp: unknown) => {
    return (
        Array.isArray(resp) &&
        resp.length > 0 &&
        'meanings' in resp[0] &&
        resp[0].meanings.length > 0 &&
        'definitions' in resp[0].meanings[0] &&
        resp[0].meanings[0].definitions.length > 0 &&
        'definition' in resp[0].meanings[0].definitions[0]
    );
};

const parseResponse = (resp: ApiResponse): Definition[] => {
    const res: Definition[] = [];

    for (let i = 0; i < DICTIONARY_DEPTH; i++) {
        for (let j = 0; j < resp[0].meanings.length; j++) {
            const meaning: ApiMeanings = resp[0].meanings[j];

            if (i >= meaning.definitions.length) break;

            res.push({
                partOfSpeech: meaning.partOfSpeech,
                definition: meaning.definitions[i].definition,
            });
        }
    }

    return res;
};

const fetchDefinitions = async (word: string): Promise<Definition[]> => {
    try {
        const res = await fetch(`${API_URL}${word}`);
        const json = await res.json();

        if (isValidResponse(json)) {
            return parseResponse(json as ApiResponse);
        } else {
            return [{ definition: 'No defintion found' }];
        }
    } catch (e) {
        return [{ definition: 'An error has occured' }];
    }
};

export default class DictionaryHelper extends Plugin {
    createContent(i: number, defintions: Definition[], modal: Modal) {
        const contentDiv = modal.contentEl.createDiv();
        const defintionExists = defintions[i].partOfSpeech !== undefined;

        const partOfSpeech = defintionExists
            ? contentDiv.createSpan({
                  text: `${defintions[i].partOfSpeech}`,
                  cls: 'part-of-speech-dictionary',
              })
            : null;

        const para = contentDiv.createEl('p', {
            text: `${defintions[0].definition}`,
            cls: `para-dictionary`,
        });

        para.toggleClass('center-para-dictionary', !defintionExists);

        const buttonDiv = contentDiv.createDiv({
            cls: 'modal-button-wrapper-dictionary',
        });

        let prevButton = null,
            nextButton = null,
            span = null;

        if (defintions.length > 1) {
            prevButton = buttonDiv.createEl('button', {
                cls: 'modal-button-dictionary',
            });

            span = buttonDiv.createSpan({
                text: `${getCountText(i, defintions.length)}`,
                cls: 'span-count-dictionary',
            });

            nextButton = buttonDiv.createEl('button', {
                cls: 'modal-button-dictionary',
            });

            setIcon(nextButton, 'arrow-right');
            setIcon(prevButton, 'arrow-left');
        }

        return { span, para, prevButton, nextButton, partOfSpeech };
    }

    updateModal(
        para: HTMLParagraphElement,
        i: number,
        definitions: Definition[],
        span?: HTMLSpanElement | null,
        part?: HTMLSpanElement | null
    ) {
        span?.setText(`${getCountText(i, definitions.length)}`);
        para.setText(definitions[i].definition);
        part?.setText(`${definitions[i].partOfSpeech}`);
    }

    async onGetDefinition(selection: string) {
        const defs = await fetchDefinitions(selection);
        let i = 0;

        const modal = new Modal(this.app);

        modal.titleEl.createSpan({
            text: `${selection}`,
            cls: 'modal-title-dictionary',
        });

        const content = this.createContent(i, defs, modal);
        const { span, para, partOfSpeech } = content;

        content.prevButton?.onClickEvent(() => {
            i = i > 0 ? i - 1 : i;
            this.updateModal(para, i, defs, span, partOfSpeech);
        });

        content.nextButton?.onClickEvent(() => {
            i = i < defs.length - 1 ? i + 1 : i;
            this.updateModal(para, i, defs, span, partOfSpeech);
        });

        modal.open();
    }

    async onload() {
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu, editor) => {
                const selection = editor.getSelection();
                if (isValidSelection(selection)) {
                    menu.addItem((item) => {
                        item.setTitle('Get definition')
                            .setIcon('search')
                            .onClick(
                                async () =>
                                    await this.onGetDefinition(selection)
                            );
                    });
                }
            })
        );

        this.addCommand({
            id: 'get-definition-dictionary',
            name: 'Get definition',
            editorCallback: async (editor: Editor) => {
                const selection = editor.getSelection();
                if (isValidSelection(selection)) {
                    await this.onGetDefinition(selection);
                    return true;
                }

                return false;
            },
        });
    }
}
