import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import { renderCalendar, CalendarEvent } from "view/dayView";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"你是谁",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new Notice("这是在干什么");
			}
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);

		this.registerMarkdownCodeBlockProcessor(
			"timevis",
			async (source, el, ctx) => {
				const [command, targetDate] = source.trim().split(/\s+/);

				if (command === "dayView" && targetDate) {
					// get json file storing calendar event from: obsidianRoot/resource/CalendarEvent/2024-12.json
					const filePath = `resource/CalendarEvent/${targetDate.slice(
						0,
						7
					)}.json`;

					if (await this.app.vault.adapter.exists(filePath)) {
						try {
							const jsonData = await this.app.vault.adapter.read(
								filePath
							);
							const allEvents: CalendarEvent[] =
								JSON.parse(jsonData);

							const filteredEvents = allEvents.filter((event) => {
								const startDate = event.start.split(" ")[2];
								const endDate = event.end.split(" ")[2];
								const targetDay = targetDate.split("-")[2];
								return (
									startDate === targetDay ||
									endDate === targetDay
								);
							});

							if (filteredEvents.length > 0) {
								renderCalendar(filteredEvents, el, targetDate);
							} else {
								el.textContent = `No events found for ${targetDate}.`;
							}
						} catch (error) {
							console.error(
								`Error reading or parsing file at ${filePath}:`,
								error
							);
							el.textContent = `Error loading events for ${targetDate}. Check the console for details.`;
						}
					} else {
						el.textContent = `No data found for ${targetDate}. Expected file: ${filePath}`;
					}
				} else {
					el.textContent =
						"Invalid command or date. Use: `summary YYYY-MM-DD`.";
				}
			}
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
