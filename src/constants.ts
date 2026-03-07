import { Restaurant } from './types';

export const RESTAURANTS: Restaurant[] = [
  {
    id: '1',
    name: 'Pizzería El Malecón',
    cuisine: 'Italiana • Pizza',
    rating: 4.8,
    deliveryTime: '20-30 min',
    image: 'https://picsum.photos/seed/pizza1/400/300',
    location: [18.4512, -69.3015],
    menu: [
      { id: '1-1', name: 'Pizza Margarita', description: 'Tomate, mozzarella y albahaca.', price: 450 },
      { id: '1-2', name: 'Pizza Pepperoni', description: 'Clásica con pepperoni y queso.', price: 550 },
      { id: '1-3', name: 'Lasaña de Carne', description: 'Pasta artesanal con salsa boloñesa.', price: 400 }
    ]
  },
  {
    id: '2',
    name: 'Comida Criolla Doña María',
    cuisine: 'Dominicana • Casera',
    rating: 4.9,
    deliveryTime: '15-25 min',
    image: 'https://picsum.photos/seed/food1/400/300',
    location: [18.4550, -69.3050],
    menu: [
      { id: '2-1', name: 'La Bandera', description: 'Arroz, habichuelas y carne guisada.', price: 300 },
      { id: '2-2', name: 'Sancocho', description: 'Sancocho de 7 carnes con arroz.', price: 450 },
      { id: '2-3', name: 'Mofongo de Chicharrón', description: 'Mofongo con ajo y chicharrón.', price: 400 }
    ]
  },
  {
    id: '3',
    name: 'Sushi San Pedro',
    cuisine: 'Asiática • Sushi',
    rating: 4.6,
    deliveryTime: '35-45 min',
    image: 'https://picsum.photos/seed/sushi1/400/300',
    location: [18.4600, -69.2980],
    menu: [
      { id: '3-1', name: 'California Roll', description: 'Cangrejo, aguacate y pepino.', price: 350 },
      { id: '3-2', name: 'Salmon Skin Roll', description: 'Piel de salmón tostada.', price: 380 },
      { id: '3-3', name: 'Gyoza de Cerdo', description: '5 unidades de empanadillas al vapor.', price: 250 }
    ]
  },
  {
    id: '4',
    name: 'Burger King SPM',
    cuisine: 'Fast Food • Hamburguesas',
    rating: 4.3,
    deliveryTime: '15-20 min',
    image: 'https://picsum.photos/seed/burger1/400/300',
    location: [18.4580, -69.3100],
    menu: [
      { id: '4-1', name: 'Whopper', description: 'La clásica hamburguesa a la parrilla.', price: 350 },
      { id: '4-2', name: 'Chicken Royale', description: 'Pollo crujiente con lechuga y mayo.', price: 320 },
      { id: '4-3', name: 'Papas Fritas Grandes', description: 'Papas fritas crujientes.', price: 150 }
    ]
  }
];

export const SPM_CENTER: [number, number] = [18.4550, -69.3050]; // San Pedro de Macorís center

export const LOGO_URL = "/logo_high_resolution.png"; // Logo oficial de Spdidos
