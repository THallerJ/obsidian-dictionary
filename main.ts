import { Plugin, Modal, App } from "obsidian";
const API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";

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

const isValidResponse = (resp: unknown) => {
	return (
		Array.isArray(resp) &&
		resp.length > 0 &&
		"meanings" in resp[0] &&
		resp[0].meanings.length > 0 &&
		"definitions" in resp[0].meanings[0] &&
		resp[0].meanings[0].definitions.length > 0 &&
		"definition" in resp[0].meanings[0].definitions[0]
	);
};

const parseResponse = (resp: ApiResponse): Definition[] => {
	const res: Definition[] = [];

	resp[0].meanings.forEach((meaning) => {
		res.push({
			partOfSpeech: meaning.partOfSpeech,
			definition: meaning.definitions[0].definition,
		});
	});

	return res;
};

const fetchDefinition = async (word: string): Promise<Definition[]> => {
	try {
		const res = await fetch(`${API_URL}${word}`);
		const json = await res.json();

		if (isValidResponse(json)) {
			return parseResponse(json as ApiResponse);
		} else {
			return [{ definition: "No defintion found" }];
		}
	} catch (e) {
		return [{ definition: "An error has occured" }];
	}
};

export default class MyPlugin extends Plugin {
	async onGetDefinition(selection: string) {
		if (selection.length > 0) {
			const defs = await fetchDefinition(selection);

			const modal = new Modal(this.app)
				.setTitle(selection)
				.setContent(defs[0].definition);

			modal.contentEl
				.createEl("div")
				.createEl("button", { text: "Prev" }, () => {
					console.log("Prev");
				})
				.createEl("button", { text: "Next" }, () => {
					console.log("Next");
				});
			modal.open();
		}
	}
	async onload() {
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor) => {
				menu.addItem((item) => {
					item
						.setTitle("Get Definition")
						.setIcon("search")
						.onClick(
							async () => await this.onGetDefinition(editor.getSelection())
						);
				});
			})
		);
	}

	async unload() {}
}
