/**
 * A character in the story.
 * Can be used to represent the player or any other entity.
 * The narrator is also a character.
 */
class SednaCharacter {
  /**
   * @param {Sedna} story - The story this character belongs to.
   * @param {string} id - Character identifier (usually the first letter of the name)
   * @param {string} [name="???"] - Name of the character.
   * @param {Record<string, unknown>} [data={}] - Additional data associated with the character.
   */
  constructor(story, id, name = "???", data = {}) {
    this.story = story;
    this.id = id;
    this.name = name;
    this.data = data;

    this.functionLike = null;
  }

  /**
   * Returns this character's say function clone, bound to this character
   * information.
   *
   * Auto-completion is something that doesn't work when using this,
   * but it shouldn't be necessary due to the Character simple nature.
   *
   * Props:
   *   - `.data` - Character data
   *   - `.character` - Character reference
   *   - `.toString()` - Returns this character name
   */
  asFunction() {
    if (this.functionLike) return this.functionLike;
    this.functionLike = this.say.bind(this);
    this.functionLike.toString = this.toString.bind(this);
    this.functionLike.data = this.data;
    this.functionLike.character = this;
    return this.functionLike;
  }

  /**
   * Sends a message from this character.
   * @returns {unknown} Whichever value the current renderer onMessage method returns.
   */
  say(message, templates) {
    return this.story.renderer.onMessage?.(this, String.raw(message, templates));
  }

  toString() {
    return this.name;
  }
}

/**
 * Base class for renderers.
 * Does nothing by default. Extend it to create a custom renderer or use the
 * builtin ones:
 * - {@link SednaHTMLRenderer}
 */
class SednaRenderer {
  constructor() {
    this.story = null;
  }

  /**
   * @param {Sedna} story
   */
  setStory(story) {
    this.story = story;
  }
}

/**
 * @typedef {object} SednaHTMLRendererConfig
 * @prop {HTMLElement | undefined} container - The container element where the game will be rendered.
 * @prop {object} narratorDisplay - Configuration for the narrator.
 * @prop {boolean} narratorDisplay.treatAsCharacter - If true, the narrator will be treated as a normal character.
 * @prop {boolean} narratorDisplay.italicize - If true, the narrator's messages will be italicized with <em>.
 * @prop {object} classes - CSS classes to apply to the game elements.
 * @prop {string} classes.name - Class for character names.
 * @prop {string} classes.message - Class for messages.
 * @prop {string} classes.menu - Class for menu elements.
 * @prop {string} classes.button - Class for menu buttons.
 * @prop {string} classes.narrator - Class for the narrator messages.
 */

/**
 * Renders story as customizable HTML elements.
 */
class SednaHTMLRenderer extends SednaRenderer {
  /**
   * @param {SednaHTMLRendererConfig} config
   */
  constructor(config = {}) {
    super();
    
    this.container = config.container || document.body;

    this.narrator = {
      treatAsCharacter: false,
      italicize: true,
      ...config.narrator
    };

    this.classes = {
      name: "game-character-name",
      message: "game-message",
      menu: "game-menu",
      button: "game-menu-button",
      narrator: "game-narrator-message",
      ...config.classes
    }
  }
  
  onNarratorMessage(message) {
    const messageEl = document.createElement("div");
    messageEl.className = this.classes.narrator;
    
    if (this.narrator.italicize) {
      const italicEl = document.createElement("em");
      italicEl.innerText = message;
      messageEl.appendChild(italicEl);
    } else {
      messageEl.innerText = message;
    }

    this.container.appendChild(messageEl);
    return messageEl;
  }

  onMessage(character, message) {
    if (character.id === this.story.narrator.id && !this.narrator.treatAsCharacter) {
      return this.onNarratorMessage(message);
    }

    const messageEl = document.createElement("div");
    messageEl.className = this.classes.message;

    const nameEl = document.createElement("span");
    nameEl.className = this.classes.name;
    nameEl.innerText = character.name;

    messageEl.append(nameEl, ": ", message);
    this.container.appendChild(messageEl);
    return messageEl;
  }

  onMenu(options, onChoose) {
    return new Promise(resolve => {
      const menuElement = document.createElement("div");
      menuElement.className = this.classes.menu;

      for (let option in options) {
        const button = document.createElement("button");
        button.className = this.classes.button;
        button.innerText = option;
        button.onclick = () => {
          this.container.removeChild(menuElement);
          resolve(typeof options[option] === "function" ? options[option](menuElement) : options[option]);
        };
        menuElement.appendChild(button);
      }

      this.container.appendChild(menuElement);
    });
  }
}

/**
 * @typedef {Record<string, unknown>} SednaCharacterConfig
 * @prop {string?} name
 */

/**
 * @typedef {object} SednaConfig
 * @prop {SednaRenderer | undefined} renderer - Renderer reference.
 * @prop {SednaCharacterConfig | undefined} narrator - Narrator character configuration.
 * @prop {Record<string, SednaCharacterConfig> | undefined} characters
 * @prop {{ [id: string]: (ctx: Record<string, unknown>) => string | undefined }} scenes
 * @prop {() => void | undefined} onSceneChange - Callback function to be called when the scene changes.
 * @prop {() => void | undefined} onFinish - Callback function to be called when the game finishes.
 * @prop {() => void | undefined} onError - Callback function to handle errors.
 */

class Sedna {
  /**
   * @param {SednaConfig} config
   */
  constructor(config = {}) {
    this.characters = {};
    this.characterFunctions = {};
    this.scenes = {};

    this.data = {};

    this.renderer = config.renderer instanceof SednaRenderer ? config.renderer : new SednaHTMLRenderer(config.renderer);
    this.renderer.setStory(this);

    const { name: narratorName, ...narratorData } = config.narrator || { name: "Narrator" };
    this.narrator = this.character("n", narratorName, narratorData);

    if (config.characters) {
      for (let id in config.characters) {
        const { name, ...data } = config.characters[id];
        this.character(id, name, data);
      }
    }

    if (config.scenes) {
      for (let id in config.scenes) {
        this.scene(id, config.scenes[id]);
      }
    }

    this.onSceneChange = config.onSceneChange;
    this.onFinish = config.onFinish;
    const defaultErrHandler = (err) => { throw new Error(err) };
    this.onError = config.onError || defaultErrHandler;
  }

  /**
   * Creates/overwrites a scene.
   * @param {string} id - Unique scene identifier.
   * @param {() => string | undefined} func - Scene function.
   */
  scene(id, func) {
    this.scenes[id] = func;
  }

  /**
   * Creates/overwrites a character.
   * @param {string} id - Unique identifier for the character.
   * @param {string} [name="???"] - Name of the character.
   * @param {Object} [data={}] - Additional data associated with the character.
   * @returns {SednaCharacter} The created character instance.
   */
  character(id, name = "???", data = {}) {
    this.characters[id] = new SednaCharacter(this, id, name, data);
    this.characterFunctions[id] = this.characters[id].asFunction();
    return this.characters[id];
  }

  /**
   * Prompts the user for a choice.
   * @param {Record<string, () => Record | string | undefined>} options - Array of menu options.
   */
  async menu(options) {
    const thenOption = options._;
    delete options._;
    const goto = this.goto.bind(this);
    const returnValue = await this.renderer.onMenu?.(options);
    if (thenOption && typeof thenOption === "function") {
      await thenOption();
    }
    if (typeof returnValue === "string") {
      await goto(returnValue);
    }
    else if (returnValue != undefined) {
      this.onError(`Unknown type returned by menu option: ${returnValue}`);
    }
  }

  /**
   * Calls a scene and returns it's result. Doesn't affect the game flow.
   * Use this for logic scenes.
   * @param {string} id - Scene id.
   */
  async call(id) {
    return await this.scenes[id]({ ...this.characterFunctions }, this.data);
  }

  /**
   * Navigates to a specific scene.
   * @param {string} id - Scene id.
   */
  async goto(id) {
    if (!this.scenes[id]) {
      this.onError(`Scene "${id}" does not exist.`);
      return;
    }

    const returnValue = await this.call(id);
    // Goes to the next scene.
    if (typeof returnValue === "string") {
      this.onSceneChange?.();
      await this.goto(returnValue);
    }
    // Possibly a menu
    else if (returnValue) {
      return await this.menu(returnValue);
    }
  }

  /**
   * Starts the game by navigating to the "start" scene.
   */
  start() {
    const onFinish = this.onFinish?.bind(this);
    this.goto("start").then(() => onFinish?.());
  }
}
