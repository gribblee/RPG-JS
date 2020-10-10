import { Weapon } from '@rpgjs/database'
import { Elements } from './elements'

@Weapon({
    name: 'Sword',
    price: 100,
    atk: 112,
    elements: [Elements.Fire]
})
export class Sword {
   
}