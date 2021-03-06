import * as PIXI from 'pixi.js'
import { Utils } from '@rpgjs/common'
import { spritesheets } from '../Sprite/Spritesheets'
import { SpritesheetOptions, TextureOptions, AnimationFrames, FrameOptions } from '../Sprite/Spritesheet'
import RpgSprite from '../Sprite/Character'


const { isFunction, arrayEquals } = Utils

type AnimationDataFrames = {
    container: PIXI.Container,
    sprites: {
        [time: number]: FrameOptions
    },
    maxTime: number,
    frames: PIXI.Texture[][],
    name: string,
    animations: AnimationFrames,
    params: any[]
} 

export class Animation extends PIXI.Sprite {

    public attachTo: RpgSprite
    private frames: PIXI.Texture[][] = []
    private spritesheet: SpritesheetOptions
    private currentAnimation: AnimationDataFrames | null = null
    private time: number = 0
    private animations: Map<string, AnimationDataFrames> = new Map()

    onFinish: () => void

    constructor(private id: string) {
        super()
        this.spritesheet = spritesheets.get(this.id)
        if (!this.spritesheet) {
            throw new Error(`Impossible to find the ${this.id} spritesheet. Did you put the right name or create the spritesheet?`)
        }
        this.createAnimations()
    }

    createTextures(options: TextureOptions): PIXI.Texture[][] {
        const { width, height, framesHeight, framesWidth, rectWidth, rectHeight, image, offset }: any = options
        const { baseTexture } = PIXI.Texture.from(image)
        const spriteWidth = rectWidth ? rectWidth : width / framesWidth
        const spriteHeight = rectHeight ? rectHeight : height / framesHeight
        const frames: any = []
        const offsetX = (offset && offset.x) || 0
        const offsetY = (offset && offset.y) || 0
        for (let i = 0; i < framesHeight ; i++) {
            frames[i] = []
            for (let j = 0; j < framesWidth; j++) {
                frames[i].push(
                    new PIXI.Texture(baseTexture, new PIXI.Rectangle(j * spriteWidth + offsetX, i * spriteHeight + offsetY, spriteWidth, spriteHeight))
                )
            }
        }
        return frames
    }

    createAnimations() {
        const { textures } = this.spritesheet
        for (let animationName in textures) {
            const optionsTextures = Object.assign(this.spritesheet, textures[animationName])
            this.animations.set(animationName, {
                container: new PIXI.Sprite(),
                maxTime: 0,
                frames: this.createTextures(optionsTextures),
                name: animationName,
                animations: textures[animationName].animations,
                params: [],
                sprites: {}
            })
        }
    }

    has(name: string): boolean {
        return this.animations.has(name)
    }

    get(name: string): AnimationDataFrames {
        return this.animations.get(name) as AnimationDataFrames
    }

    isPlaying(name?: string): boolean {
        if (!name) return !!this.currentAnimation
        if (this.currentAnimation == null) return false
        return this.currentAnimation.name == name
    }

    stop() {
        this.currentAnimation = null
        this.parent.removeChild(this)
    }

    play(name: string, params: any[] = []) {

        const animParams = this.currentAnimation?.params

        if (this.isPlaying(name) && arrayEquals(params, animParams || [])) return
       
        const animation = this.get(name)

        if (!animation) {
            throw new Error(`Impossible to play the ${name} animation because it doesn't exist on the ${this.id} spritesheet`)
        }

        this.removeChildren()
        animation.sprites = {}
        this.currentAnimation = animation
        this.currentAnimation.params = params
        this.time = 0

        let animations: any = animation.animations;
        animations = isFunction(animations) ? (animations as Function)(...params) : animations

        this.currentAnimation.container = new PIXI.Container()

        for (let container of (animations as FrameOptions[][])) {
            const sprite = new PIXI.Sprite()
            for (let frame of container) {
                this.currentAnimation.sprites[frame.time] = frame
                this.currentAnimation.maxTime = Math.max(this.currentAnimation.maxTime, frame.time)
            }
           this.currentAnimation.container.addChild(sprite)
        }

        this.addChild(this.currentAnimation.container)
        // Updates immediately to avoid flickering
        this.update()
    }

    update() {
        if (!this.isPlaying() || !this.currentAnimation) return  

        const { frames, container, sprites } = this.currentAnimation

        if (this.attachTo) {
            const { x, y } = this.attachTo.getPositionsOfGraphic('middle')
            container.x = x
            container.y = y
        }

        for (let _sprite of container.children) {
            const sprite = _sprite as PIXI.Sprite
            const frame = sprites[this.time]
            if (!frame || frame.frameY == undefined || frame.frameX == undefined) {
                continue
            }
            sprite.texture = frames[frame.frameY][frame.frameX]
            const applyTransform = (prop) => {
                if (frame[prop]) {
                    sprite[prop].set(frame.anchor)
                }
                else if (this.spritesheet[prop]) {
                    sprite[prop].set(...this.spritesheet[prop])
                }
            }
            const applyTransformValue = (prop, alias = '') => {
                const optionProp = alias || prop
                if (frame[optionProp] !== undefined) {
                    sprite[prop] = frame[optionProp]
                }
                else if (this.spritesheet[optionProp] !== undefined) {
                    sprite[prop] = this.spritesheet[optionProp]
                }
            }

            applyTransform('anchor')
            applyTransform('scale')
            applyTransform('skew')
            applyTransform('pivot')

            applyTransformValue('alpha', 'opacity')
            applyTransformValue('x')
            applyTransformValue('y')
            applyTransformValue('angle')
            applyTransformValue('rotation')
            applyTransformValue('visible')
        }
        this.time++
        if (this.time > this.currentAnimation.maxTime) {
            this.time = 0
            if (this.onFinish) this.onFinish()
        }
    }
}