// https://jsfiddle.net/jwcarroll/2r69j1ok/3/
// https://stackoverflow.com/questions/40472364/moving-object-from-a-to-b-smoothly-across-canvas

import * as PIXI from "pixi.js";
import UserGarden from "./userGarden";
import { sound } from '@pixi/sound';
import { randomInRange } from "./utils";
import { ALTTEXT_KO } from "../../altText-constants";

const CULL_BOUNDS = 1100

export default class GardensLayer extends PIXI.Container {
  constructor(users, creatures, selfGarden) {
    super()
    this.users = users
    this.creatures = creatures
    this.userGarden = selfGarden
    this.tapTimestamp = 0

    this.drawBackgrounds()
  }

  drawBackgrounds() {
    let currentUser = Object.values(this.users).filter(u => u.uid == window.UID)[0]

    Object.values(this.users).forEach(u => {
      if (!u.gardenSection) return

      console.log("current user garden: ", currentUser.gardenSection);
      if (!window.APP.getIsAdmin()) {
        // update server info to client window
        // currentUser.gardenSection.width = window.GARDEN_WIDTH;
        // currentUser.gardenSection.height = window.GARDEN_HEIGHT;

        let isWideScreen = (window.innerWidth > window.innerHeight)
        let dX = Math.abs(u.gardenSection.x - currentUser.gardenSection.x)
        let dY = Math.abs(u.gardenSection.y - currentUser.gardenSection.y)
        let dOne = (isWideScreen) ? (dX) : (dY)
        let dZero = (isWideScreen) ? (dY) : (dX)          
        if (dOne > CULL_BOUNDS || dZero > (CULL_BOUNDS - 1000)) {
          return
        }
      }
      
      const garden = new UserGarden(this.users, this.creatures, u.gardenSection, u.uid)
      garden.x = u.gardenSection.x
      garden.y = u.gardenSection.y
      this.addChild(garden)

      if (u.uid == currentUser.uid) {   
        
        // Add Move button for my garden only     
        if(window.ASSIST_MODE && !window.IS_ADMIN){
          console.log("garden move button for user ", u.uid, currentUser.uid)
          this.createMoveButton()
        }
        // This is the current user, we need to add an event listener for click
        garden.interactive = true
        garden.on('mousedown', this.onGardenTap)
        garden.on('touchstart', this.onGardenTap)
      }
    })
  }

// ACCESSIBILITY
  createMoveButton() {

    if(!document.getElementById('move')) {
      const accessButton = document.createElement("button");
      accessButton.id = "move"
      accessButton.innerText = "이동"
      accessButton.onclick = this.onGardenButtonClick

      const buttonAltText = ALTTEXT_KO[window.GARDEN].moveButton;
      accessButton.ariaLabel = buttonAltText

      const accessDiv = document.querySelector('.accessibility');
      accessDiv.appendChild(accessButton)
    }
}

  onGardenButtonClick = () => {
    window.SCREENREADER.textContent = ALTTEXT_KO[window.GARDEN].move;

    let globalCoordinate = new PIXI.Point(randomInRange(0, window.innerWidth), randomInRange(100, window.innerHeight-100))
    let local = this.toLocal(globalCoordinate)
    window.APP.sendGardenTap(local)
  }

  onGardenTap = (e) => {
    const now = new Date().getTime()
    if (now - this.tapTimestamp > 5000) {
      let local = this.toLocal(e.data.global)
      window.APP.sendGardenTap(local)
      this.tapTimestamp = now  
    }
  }

  // playSoundtrack() {
  //   console.log("GARDEN SOUND:", window.AUDIO._sounds)

  //   if(!window.AUDIO._sounds?.gardenTapSound?.isPlaying){ // if not playing
  //     window.AUDIO.play('gardenTapSound')
  //   }  
  // }

  updateOnlineUsers(onlineUsers) {
    let currentUser = Object.values(this.users).filter(u => u.uid == window.UID)[0]

    // First, remove creatures that aren't online anymore
    let tilesToRemove = []
    let existingUsers = {}
    for (let c of this.children) {
      if (!onlineUsers[c.uid]) tilesToRemove.push(c)
      existingUsers[c.uid] = c
    }
    for (let c of tilesToRemove) {
      this.removeChild(c)
    }
    
    // Second, add creatures that don't exist
    for (let k of Object.keys(onlineUsers)) {
      if (!existingUsers[k]) {
        if (!window.APP.getIsAdmin()) {
          let u = onlineUsers[k]
          let isWideScreen = (window.innerWidth > window.innerHeight)
          let dX = Math.abs(u.gardenSection.x - currentUser.gardenSection.x)
          let dY = Math.abs(u.gardenSection.y - currentUser.gardenSection.y)
          let dOne = (isWideScreen) ? (dX) : (dY)
          let dZero = (isWideScreen) ? (dY) : (dX)          
          if (dOne > CULL_BOUNDS || dZero > (CULL_BOUNDS - 1000)) {
            continue
          }
        }  

        const garden = new UserGarden(this.users, this.creatures, onlineUsers[k].gardenSection, onlineUsers[k].uid)
        garden.x = onlineUsers[k].gardenSection.x
        garden.y = onlineUsers[k].gardenSection.y
        this.addChild(garden)  
      }
    }    
  }

  tick() {
    this.children.forEach(bg => {
      if(bg.tick) bg.tick()
    })
  }
}