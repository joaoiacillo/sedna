(function () {
  /**
   * Base class for characters in the game.
   * Characters can be used to represent players, NPCs, or any other entities in the game.
   */
  class Character {
    /**
     * @param {Game} game - The game instance this character belongs to.
     * @param {string} id - Unique identifier for the character.
     * @param {string} [name="???"] - Name of the character.
     * @param {Object} [data={}] - Additional data associated with the character.
     */
    constructor(game, id, name = "???", data = {}) {
      this.game = game;
      this.id = id;
      this.name = name;
      this.data = data;
    }

    /**
     * Sends a message from this character.
     * @param {string} message - The message to send.
     * @returns {any} Whichever value the current renderer onMessage method returns.
     */
    say(message) {
      return this.game.renderer.onMessage?.(this, message);
    }

    toString() {
      return this.name;
    }
  }

  /**
   * Base class for game renderers.
   * This class should be extended to create custom renderers.
   */
  class Renderer {
    constructor() {
      this.game = null;
    }
    
    insert(game) {
      this.game = game;
    }
  }

  /**
   * Customizable HTML renderer. It's the default for the game.
   */
  class HtmlRenderer extends Renderer {
    /**
     * 
     * @param {Object} config - Configuration object.
     * @param {HTMLElement?} config.container - The container element where the game will be rendered.
     * @param {Object} config.narrator - Configuration for the narrator.
     * @param {boolean} config.narrator.treatAsCharacter - If true, the narrator will be treated as a normal character.
     * @param {boolean} config.narrator.italicize - If true, the narrator's messages will be italicized with <em>.
     * @param {Object} config.classes - CSS classes to apply to the game elements.
     * @param {string} config.classes.name - Class for character names.
     * @param {string} config.classes.message - Class for messages.
     * @param {string} config.classes.menu - Class for menu elements.
     * @param {string} config.classes.button - Class for menu buttons.
     * @param {string} config.classes.narrator - Class for the narrator messages.
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
      if (character.id === this.game.narrator.id && !this.narrator.treatAsCharacter) {
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

    onMenu(options) {
      const menuElement = document.createElement("div");
      menuElement.className = this.classes.menu;

      options.forEach(option => {
        const button = document.createElement("button");
        button.className = this.classes.button;
        button.innerText = option.text;
        button.onclick = () => {
          option.action();
          this.container.removeChild(menuElement);
        };
        menuElement.appendChild(button);
      });

      this.container.appendChild(menuElement);
      return menuElement;
    }
  }
	
	class Game {
    /**
     * 
     * @param {Object} config - Configuration object for the game.
     * @param {Renderer | { type: Renderer, [key: string]: any }} config.renderer - Renderer instance to use for rendering the game.
     * @param {Object} config.narrator - Configuration for the narrator character.
     * @param {string} config.narrator.id - ID of the narrator character.
     * @param {string} config.narrator.name - Name of the narrator character.
     * @param {Function} config.onSceneChange - Callback function to be called when the scene changes.
     * @param {Function} config.onFinish - Callback function to be called when the game finishes.
     * @param {Function} config.onError - Callback function to handle errors.
     */
    constructor(config = {}) {
      this.characters = {};
      this.scenes = {};

      this.narrator = this.character(
        config.narrator?.id || "narrator",
        config.narrator?.name || "Narrator"
      );

      this.config = config;

      if (config.renderer instanceof Renderer) {
        this.renderer = config.renderer;
      }
      else {
        const RendererClass = config.renderer.type || HtmlRenderer;
        if (typeof RendererClass !== "function" || !(RendererClass.prototype instanceof Renderer)) {
          throw new Error("Invalid renderer type provided.");
        }
        this.renderer = new RendererClass(config.renderer);
      }

      this.renderer.insert(this);

      this.onSceneChange = config.onSceneChange;
      this.onFinish = config.onFinish;
      this.onError = config.onError || this._defaultErrorHandler;
    }

    _defaultErrorHandler(error) {
      throw new Error(error);
    }

    /**
     * Defines a new scene in the game.
     * @param {string} label - Unique identifier for the scene.
     * @param {Function} actions - Function that contains the actions for the scene.
     */
    scene(label, actions) {
      this.scenes[label] = actions;
    }

    /**
     * Creates a new character in the game.
     * @param {string} id - Unique identifier for the character.
     * @param {string} [name="???"] - Name of the character.
     * @param {Object} [data={}] - Additional data associated with the character.
     * @returns {Character} The created character instance.
     */
    character(id, name = "???", data = {}) {
      const c = new Character(this, id, name, data);
      this.characters[id] = c;
      return c;
    }

    /**
     * Prompts the user for a choice.
     * @param {Array<{ text: string, action: Function }>} options - Array of menu options.
     * @returns {HTMLElement} The menu element.
     */
    menu(options) {
      if (!Array.isArray(options)) {
        return this.onError("Menu options must be an array.");
      }

      const goto = this.goto.bind(this);

      options = options.map(option => {
        const _action = option.action;
        option.action = () => {
          const ret = _action();
          if (typeof ret === "string") {
            goto(ret);
          }
        };
        return option;
      });

      return this.renderer.onMenu?.(options);
    }

    /**
     * Navigates to a specific scene.
     * @param {string} label - The label of the scene to navigate to.
     */
    goto(label) {
      if (!this.scenes[label]) {
        this.onError(`Scene "${label}" does not exist.`);
        return;
      }

      const nextScene = this.scenes[label]();
      if (typeof nextScene === "string") {
        this.onSceneChange?.();
        this.goto(nextScene);
      }
    }

    /**
     * Starts the game by navigating to the "start" scene.
     */
    start() {
      this.goto("start");
      this.onFinish?.();
    }
  }

  const sedna = {
    __VERSION: "1.0.0-dev",

    Renderer,
    HtmlRenderer,
    
    Character,
    Game,

    game: (config = {}) => new Game(config)
  };

  window.sedna = sedna;
})();
