import * as PIXI from 'pixi.js'
import { distanceAndAngleBetweenTwoPoints, sleep, Vector } from './utils';
import { DWC_META } from '../../../shared-constants';
import PixiSVG from '../svg-lib'
import SVGShape from './Geometry/SVGCreatureShape';
import { randomElementFromArray, easeInOutBounce, easeInOutQuart, lerp } from './utils';
import MossCluster from "./Creatures/MossCluster"
import MushroomCluster from "./Creatures/MushroomCluster"
import TWEEN from '@tweenjs/tween.js'

export default class Creature extends PIXI.Container {
    constructor(state) {
        super()

        console.log('creature state: ', state)
        const { appearance, _id, animatedProperties } = state;        
        this.name = _id
        this.ownerId = state.owner._id
        this.animatedProperties = animatedProperties        
        this.appearance = appearance        
        this.creatureName = state.owner.username

        this.alpha = 0

        const { fillColor, radius } = appearance;
        const hex = PIXI.utils.rgb2hex([fillColor.r, fillColor.g, fillColor.b])
    
        let fromX = this.animatedProperties.position.from.x
        let fromY = this.animatedProperties.position.from.y
        let toX = this.animatedProperties.position.to.x
        let toY = this.animatedProperties.position.to.y        

        // This should actually be somewhere between from and to, depending on the timestamp.
        this.x = fromX
        this.y = fromY
        this.vx = 0
        this.vy = 0
        this.originPos = { x: fromX, y: fromY }
        this.target = { x: toX, y: toY }
        this.movementDuration = this.animatedProperties.position.duration
        this.movementAlpha = 0        
        this.creatureTargetRotation = 0
            
        this.destinationMarker = new PIXI.Graphics()        
        this.destinationMarker.beginFill(0xffffff)
        this.destinationMarker.drawCircle(0, 0, 5);
        this.destinationMarker.endFill();
        this.destinationMarker.x = toX - this.x
        this.destinationMarker.y = toY - this.y

        this.interactive = true
        this.on('mousedown', this.onMouseDown)
        this.on('mouseup', this.onMouseUp)
        this.on('mouseupoutside', this.onMouseUp)

        this.on('touchstart', this.onMouseDown)
        this.on('touchend', this.onMouseUp)
        this.on('touchendoutside', this.onMouseUp)

        // this.addChild(this.destinationMarker)

        switch (appearance.creatureType) {
            case 'moss':
                this.creature = new MossCluster(appearance, this.creatureName)
                break
            case 'lichen':
                break
            case 'mushroom':
                this.creature = new MushroomCluster(appearance, this.creatureName)
                break
        }

        this.addChild(this.creature)
        this.creature.scale.set(appearance.scale)
        this.creature.startAnimatingGrowth(1000)
        this.frame = 0

        this.updateTargetPosition(state.animatedProperties.position)
        const label = new PIXI.Text(this.name, new PIXI.TextStyle({ fontSize: 40 }))
        // this.addChild(label)
    }

    onMouseDown = async (e) => {        
        window.APP.sendEvolveCreature(this.name)
    }
    onMouseUp = async (e) => {
        // console.log('on mouse up')
        // const tween = new TWEEN.Tween(this.scale)
        // .to({x: 1, y: 1 }, 600)
        // .easing(TWEEN.Easing.Quartic.InOut)
        // .start()
    }

    async evolve() {
        if (!this.isEvolving) {
            this.isEvolving = true

            const tween = new TWEEN.Tween(this.scale)
            .to({x: 1.4, y: 1.4 }, 800)
            .easing(TWEEN.Easing.Quartic.InOut)
            .start()
            await sleep(800)
                
            if (this.creature.evolve) this.creature.evolve(1000)            

            const tween2 = new TWEEN.Tween(this.scale)
            .to({x: 1, y: 1 }, 800)
            .easing(TWEEN.Easing.Quartic.Out)
            .start()    

            await sleep(300)

            this.isEvolving = false
        }
    }

    updateState(newState) {
        for (const [key, prop] of Object.entries(newState)) {
            this.animatedProperties[key] = prop

            switch (key) {
                case (DWC_META.creaturePropertyTypes.position):
                    this.updateTargetPosition(prop)
                    break

                default:
                    break
            }
        }
    }

    async updateTargetPosition(prop) {
        console.log('updateTargetPosition for: ', prop)

        this.target.x = prop.to.x
        this.target.y = prop.to.y
        this.destinationMarker.x = this.target.x
        this.destinationMarker.y = this.target.y
        this.originPos.x = this.x
        this.originPos.y = this.y
        this.movementAlpha = 0
        this.movementDuration = this.animatedProperties.position.duration
        this.creatureTargetRotation = Math.atan2(this.target.y - this.originPos.y, this.target.x - this.originPos.x)

        if (this.motionTween) {
            TWEEN.remove(this.motionTween)
            this.motionTween = null
        }

        const alphaTween = new TWEEN.Tween(this)
        .to({ alpha: 0.001 }, 1000)
        .easing(TWEEN.Easing.Quartic.InOut)
        .start()
        await sleep(1000)
        
        this.position.set(prop.teleport.x, prop.teleport.y)
        // this.x = prop.teleport.x
        // this.y = prop.teleport.y

        const alphaInTween = new TWEEN.Tween(this)
        .to({ alpha: 1 }, 1000)
        .easing(TWEEN.Easing.Quartic.InOut)
        .start()
        await sleep(500)

        this.motionTween = new TWEEN.Tween(this)
        .to({ x: this.target.x, y: this.target.y }, this.movementDuration * 1000)
        .easing(TWEEN.Easing.Linear.None)
        .start()
    
        // tween.onComplete( () => console.log("appear done") )
    
        await sleep(this.movementDuration * 1000)
    }

    tick(d) {
        const delta = PIXI.Ticker.shared.elapsedMS
        this.frame++

        // Per-frame update for the creature SVG Shape outlines
        this.creature.tick()
        this.creature.rotation += 0.001

        /*
        // Movement animation
        if (this.movementAlpha > 1) {
            this.movementAlpha = 1 
        } else {
            const step = delta / (1000 * this.movementDuration)
            this.movementAlpha += step

            if (this.appearance.creatureType == 'moss') {                
                this.easedMovementAlpha = this.movementAlpha
            } else {
                this.easedMovementAlpha = this.movementAlpha//easeInOutQuart(this.movementAlpha)
            }

            if (this.frame % 1 == 0 || this.appearance.creatureType != 'moss') {
                this.creature.rotation = 0.001 * this.creatureTargetRotation + 0.999 * this.creature.rotation
                this.x = lerp(this.originPos.x, this.target.x, this.easedMovementAlpha)
                this.y = lerp(this.originPos.y, this.target.y, this.easedMovementAlpha)
            }
        }

        //console.log('creature tick: ', this.x, this.y)
        
        this.destinationMarker.x = this.target.x - this.x
        this.destinationMarker.y = this.target.y - this.y
        */
    }
}
