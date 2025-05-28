# Sedna

Sedna is a simple story engine for JavaScript, designed to help developers create interactive stories and games with ease in just ~10KB.

## Usage

For the moment, copy and paste the `sedna.js` file into your project and include it in your HTML file. In the future, we will provide a package manager for easier installation.

## Documentation

### Creating a Game

To create a new game instance, you can use the `sedna.game` function. Here's a simple example:

```js
const container = document.getElementById('game-container');
const game = sedna.game({ renderer: { container } });
```

The game instance allows you to manage the game renderer, scenes, and characters.

### Adding Scenes

Scenes are the building blocks of your game. You can create a scene using the `game.scene` function. Here's how to add a scene:

```js
game.scene("start", () => {
  // Scene logic goes here
});
```

Your game can have an unlimited number of scenes, and you can switch between them by returning a scene name from the function.

```js
game.scene("start", () => {
  // Logic for the start scene
  return "nextScene"; // Switch to the next scene
});

game.scene("nextScene", () => {
  // Logic for the next scene
});
```

### Adding Characters

Characters are the essential part of your story. In Sedna they are objects that have an id, a name and a set of properties for data storage.

```js
const player = game.character("player", "You");
const npc = game.character("npc", "Mysterious Stranger", { age: 30, occupation: "Merchant" });
```

Characters are always stored in the game instance and can be accessed by their id:

```js
const player = game.character("player", "Player");
game.characters["player"].name = "Hero"; // Change the player's name
```

Data attributes can be modified through the `data` property:

```js
game.characters["npc"].data.age = 31; // Change the NPC's age
```

### Making the Character Speak

To make a character speak, you can use the `say` method:

```js
player.say("Hello, world!");
```

> The way your character "speaks" is completly customizable for your needs. You can learn more about this in the [Creating Custom Renderers](#creating-custom-renderers) section.

### The Narrator

Sedna provides a special character called the "Narrator" that can be used to describe scenes or provide additional context. You can access the narrator using `game.narrator`:

```js
const narrator = game.narrator;
narrator.say("Once upon a time...");
```

### Letting the Player Choose

To allow the player to make choices, you can use the `menu` method. This method takes an array of choices and a callback function that will be called with the selected choice:

```js
game.menu([
  { text: "Option 1", action: () => console.log("You chose option 1") },
  { text: "Option 2", action: () => console.log("You chose option 2") },
  { text: "Option 3", action: () => console.log("You chose option 3") }
]);
```

Although the options are not scenes, if they return a scene name, the game will switch to that scene automatically:

```js
game.menu([
  { text: "Start Adventure", action: () => "adventureScene" },
  { text: "Exit", action: () => "exitScene" }
]);

game.scene("adventureScene", () => {
  // Logic for the adventure scene
});

game.scene("exitScene", () => {
  // Logic for the exit scene
});
```
### Creating Custom Renderers

Each game instance holds a `renderer` property that is responsible for rendering the game. A renderer is a class that extends from the `sedna.Renderer` class. Below is an example of how to create a custom renderer:

```js
class MyCustomRenderer extends sedna.Renderer {
  constructor(container) {
    super();
    this.container = container;
  }

  // Called whenever a character speaks
  onMessage(character, message) {}

  // Called whenver the player needs to make a choice
  onMenu(options) {}
}

const container = document.getElementById('game-container');

const game = sedna.game({
  renderer: MyCustomRenderer(container)
});
```

By default Sedna provides a simple HTML-based renderer that displays characters' messages and choices in a basic format. You can customize this renderer to fit your game's needs.

You can customize the renderer in a game configuration in three ways:

1. By passing a custom renderer class to the `renderer` property.
2. By providing a configuration object with options for the default renderer.
3. By providing a configuration object with options for a custom renderer class, alongside the `type` property (which is a reference to the class, not an instance).
4. 
```js
const container = document.getElementById('game-container');

// Using a custom renderer class
sedna.game({
  renderer: MyCustomRenderer(container)
})

// Still using HtmlRenderer as the default renderer
sedna.game({
  renderer: {
    container, // The container where the renderer will render the game
    narrator: {
      treatAsCharacter: true, // Whether the narrator should be treated as a normal character
      italic: false, // Whether the narrator's text should be italicized
    }
  }
});

// Using a custom renderer class with options
sedna.game({
  renderer: {
    type: MyCustomRenderer, // Reference to the custom renderer class
    container, // The container where the renderer will render the game
  }
});
```

Each renderer may implement a different approach for configuration, so read the documentation for them.

All renderers have access to the game instance through the `this.game` property, allowing you to interact with the game state, characters, and scenes.

## Contributing

If you'd like to contribute to Sedna, please fork the repository and submit a pull request. I welcome contributions of all kinds, including bug fixes, new features, and documentation improvements.
