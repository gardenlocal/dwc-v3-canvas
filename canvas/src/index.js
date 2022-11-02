// https://pixijs.io/guides/basics/getting-started.html
// https://www.html5gamedevs.com/topic/45444-unable-to-load-pixijs-as-a-module/
// https://codesandbox.io/s/app-architecture-3-t6cfv?file=/src/models.js
// https://github.com/pixijs/pixijs/pull/6415

import * as PIXI from "pixi.js";
import CreaturesLayer from "./render/CreaturesLayer.js";
import { loadAll } from './render/assetLoader';
import { DWC_META } from "../../shared-constants";
import SVGCreatureShape from "./render/Geometry/SVGCreatureShape";
import { addStats, Stats } from 'pixi-stats';
import TWEEN from '@tweenjs/tween.js'
import { sound } from '@pixi/sound';
import { renderCreatureTest } from './render/creatureTest'
import { randomElementFromArray } from "./render/utils.js";
import GardensLayer from "./render/GardensLayer";

PIXI.settings.SPRITE_MAX_TEXTURES = Math.min(PIXI.settings.SPRITE_MAX_TEXTURES, 16);
PIXI.settings.FILTER_MULTISAMPLE = PIXI.MSAA_QUALITY.NONE
PIXI.settings.PRECISION_FRAGMENT = 'highp';
PIXI.settings.ROUND_PIXELS = true
PIXI.settings.ANISOTROPIC_LEVEL = 0

export default class PixiAppWrapper {
  constructor(options) {
    this.isAdmin = (options && options.isAdmin)
    window.IS_ADMIN = this.isAdmin;
    this.setupPixiApp()
    // this.setupStats()
    this.setupTween()
    this.resizeAppToWindow()

    this.setupLoadingScreen()
    //this.start()
  }

  setupPixiApp() {
    this.GARDEN_WIDTH = window.GARDEN_WIDTH = window.innerWidth;
    this.GARDEN_HEIGHT = window.GARDEN_HEIGHT = window.innerHeight;
    this.pixiContainer = document.querySelector("#root")    
    this.pixiApp = new PIXI.Application({
      antialias: true,
      resolution: 2,
      resizeTo: this.pixiContainer
    })

    window.DWCApp = this.pixiApp

    this.pixiContainer.appendChild(this.pixiApp.view)

    console.log(this.pixiContainer.children)
    this.pixiContainer.children[0].style.position = 'absolute'
    this.pixiContainer.children[0].style.top = '0px'
    this.pixiContainer.children[0].style.left = '0px'
    // this.pixiContainer.children[0].style.transform = 'translateX(-25%) translateY(-25%) scale(1.0)'

    this.pixiApp.renderer.backgroundColor = 0xf9f9f9;

    this.ticker = PIXI.Ticker.shared

    this.appContainer = new PIXI.Container()
    this.pixiApp.stage.addChild(this.appContainer)
    
    if (window.APP.isTest) {
      this.pixiApp.stage.alpha = 0
      return
    }
    
    this.pixiApp.ticker.add(() => {
      this.tick()
    })
  }

  setupStats() {
    this.stats = addStats(document, this.pixiApp);
    this.ticker.add(this.stats.update, this.stats, PIXI.UPDATE_PRIORITY.UTILITY)
  }

  setupTween() {
    this.ticker.add(() => { TWEEN.update() }, this, PIXI.UPDATE_PRIORITY.HIGH)
  }

  setupLoadingScreen() {
    this.isLoading = true
    this.loadingScreen = new PIXI.Container()
    this.loadingText = new PIXI.Text("Loading...", new PIXI.TextStyle({
      fontSize: 20,
      fill: "black",
    }))
    // this.loadingScreen.addChild(this.loadingText)
    const bbox = this.loadingScreen.getBounds()
    this.loadingScreen.pivot.set(bbox.width, bbox.height)
    this.loadingScreen.position.set(this.GARDEN_WIDTH / 2, this.GARDEN_HEIGHT / 2)

    this.pixiApp.stage.addChild(this.loadingScreen)
  }

  async loadAssets() {
    console.log('start load assets')
    await loadAll((t) => {
      console.log('Loading progress: ', t.progress)
    })

    // Have all available creatures globally available, in order to be able to morph between them.
    // window.DWCCreatureShapes = Object.keys(DWC_META.creatures).reduce((acc, k) => {
    //   console.log('reduce ', acc, k)
    //   const svgData = PIXI.Loader.shared.resources[DWC_META.creatures[k]].data
    //   acc[DWC_META.creatures[k]] = new SVGCreatureShape(svgData)
    //   return acc
    // }, {})

    await this.loadBackgroundSound()

    // load sound effects for users only
    if(!window.IS_ADMIN) {
      this.loadEvolveSound()
      this.loadMoveSound()
    }
  }

  async loadBackgroundSound() {
    // load backgrond sound
    let soundtrack;
    switch(window.GARDEN) {
      case 'moss':
        soundtrack = require('../assets/audio/1.mp3');
        break;
      case 'lichen':
        soundtrack = require('../assets/audio/3.mp3');
        break;
      case 'mushroom':
        soundtrack = require('../assets/audio/2.mp3');
        break;
      case 'all':
        soundtrack = require('../assets/audio/3.mp3');
        break;
    }
    /*
    if(soundtrack) {
      sound.add('background', {
        url: soundtrack,
        preload: true,
        loop: true,
        autoPlay: true
      });
    }
    */
    window.AUDIO = sound;

  }

  async loadEvolveSound() {
          
    let evolveSound = require('../assets/audio/creatureEvolveB.mp3');

    if(evolveSound){
      window.AUDIO.add('creatureTapSound', {
        url: evolveSound,
        preload: true,
        loop: false,
      });
    }
  }

  async loadMoveSound() {
    let moveSound = require('../assets/audio/gardenTouch5.mp3');

    if(moveSound){
      window.AUDIO.add('gardenTapSound', {
        url: moveSound,
        preload: true,
        loop: false,
      });
    }
  }

  resizeAppToWindow() {
    // update 2022: no more square, fit to window size. No need of scale variable
    const scale = Math.min(window.innerWidth, window.innerHeight) / 400
    window.DWCApp.stage.scale.set(1.0);
  
    // if (window.innerWidth < window.innerHeight)
    //   window.DWCApp.stage.pivot.set(0, (-window.innerHeight / scale + window.GARDEN_HEIGHT) / 2)
    // else
    //   window.DWCApp.stage.pivot.set((-window.innerWidth / scale + window.GARDEN_WIDTH) / 2, 0)    
  }
  updateOnlineCreatures(onlineUsers, onlineCreatures) {
    if (this.gardenLayer) {
      this.gardenLayer.updateOnlineUsers(onlineUsers)
    }
    if (this.creaturesLayer) {
      this.creaturesLayer.updateOnlineCreatures(onlineCreatures)
    }
  }
  updateCreatureData(creatureData) {
    if (this.creaturesLayer) {
      this.creaturesLayer.updateCreatureData(creatureData)
    }
  }
  evolveCreature(_id) {
    this.creaturesLayer.evolveCreature(_id)
  }
  render() {
    if (window.APP.isTest) {
      this.pixiApp.stop()
      return
    }

    if (false) {
      renderCreatureTest(this.pixiApp)
    } else {
      if (this.isAdmin) {
        this.adminContainer = new PIXI.Container()
        this.adminContainer.position.set(400, 400)
        this.adminContainer.scale.set(0.2)
        //this.adminContainer.backgroundColor = 0xff0000
        this.pixiApp.stage.addChild(this.adminContainer)
  
        this.gardenLayer = new GardensLayer(window.APP.onlineUsers, window.APP.onlineCreatures, window.APP.selfGarden)
        this.adminContainer.addChild(this.gardenLayer)
  
        this.creaturesLayer = new CreaturesLayer(window.APP.onlineUsers, window.APP.onlineCreatures, window.APP.selfGarden)      
        this.adminContainer.addChild(this.creaturesLayer)
  
        const bbox = this.adminContainer.getBounds()

        if (window.APP.hasAdminSequence()) {
          if (this.adminInterval) window.clearInterval(this.adminInterval)        
          this.adminInterval = setInterval(() => {
            if (this.adminContainer.scale.x < 0.5) {
  
              let users = Object.values(window.APP.onlineUsers)
              let user = null
              while (!user) {
                let currUser = randomElementFromArray(users)
                if (currUser.gardenSection) user = currUser
              }
              
              this.adminContainer.scale.set(1)
              this.adminContainer.position.set(-user.gardenSection.x, -user.gardenSection.y)
            } else {
              this.adminContainer.position.set(400, 400)
              this.adminContainer.scale.set(0.2)
            }
          }, 30000)  
        }
  
        //this.pixiApp.stage.scale.set(window.innerWidth / bbox.width)
      } else {
        //this.gardenLayer = new UserGarden(window.APP.onlineUsers, window.APP.onlineCreatures, window.APP.selfGarden, window.APP.selfUid)
        this.gardenLayer = new GardensLayer(window.APP.onlineUsers, window.APP.onlineCreatures, window.APP.selfGarden)
        this.gardenLayer.x = -window.APP.selfGarden.x
        this.gardenLayer.y = -window.APP.selfGarden.y  
        this.pixiApp.stage.addChild(this.gardenLayer)
  
        this.creaturesLayer = new CreaturesLayer(window.APP.onlineUsers, window.APP.onlineCreatures, window.APP.selfGarden)      
        this.creaturesLayer.x = -window.APP.selfGarden.x
        this.creaturesLayer.y = -window.APP.selfGarden.y  
        this.pixiApp.stage.addChild(this.creaturesLayer)
  
        if(!window.IS_ADMIN){
          console.log("play soundtrack for users only")
          this.playSoundtrack()
        }
      }  
    }

    this.pixiApp.resize()

    this.isLoading = false
    this.loadingScreen.alpha = 0
  }

  playSoundtrack() {
    var root = document.getElementById("root")
    // mobile
    root.addEventListener('touchstart', () => {
      console.log('touch: start music')

      /*
      if(!sound._sounds?.background?.isPlaying){ // if not playing
        sound.play('background')
        console.log(sound._sounds.background)
      }
      */
    })

    // test for pc version
    root.addEventListener('click', () => {
      console.log('click: start music')

      /*
      if(!sound._sounds?.background?.isPlaying){ // if not playing
        sound.play('background')
        console.log(sound._sounds.background)
      }
      */
    })
  }

  stop() {
    this.pixiApp.stage.removeChildren()
  }
  reset() {
    this.pixiApp.stage.removeChildren()
    this.render()
  }

  tick() {
    if (this.gardenLayer) {
      this.gardenLayer.tick()
    }
    if (this.creaturesLayer) {
      this.creaturesLayer.tick()
    }
  }
}