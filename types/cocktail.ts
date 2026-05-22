export interface Cocktail {
  id?: string;
  name: string;
  slug: string;
  category: 'Signature' | 'Classic' | 'Mocktail' | 'Special';
  description: string;
  ingredients: string[];
  price: number;
  image_url: string;
  card_color: string;
  is_active: boolean;
  created_at?: string;
}
