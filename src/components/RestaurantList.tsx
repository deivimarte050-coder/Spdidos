import React, { useState, useEffect } from 'react';
import { Star, Clock, MapPin, ChevronRight, ChevronLeft } from 'lucide-react';
import { Restaurant } from '../types';
import { AdminService } from '../services/AdminService';

interface RestaurantListProps {
  onSelect: (restaurant: Restaurant) => void;
  title?: string;
}

const RestaurantList: React.FC<RestaurantListProps> = ({ onSelect, title = "Descubre estas opciones" }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    return AdminService.subscribe((data) => {
      setRestaurants(data.restaurants);
    });
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black font-display text-gray-900 tracking-tight">{title}</h2>
        <div className="hidden lg:flex gap-2">
          <button 
            onClick={() => scroll('left')}
            className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <button 
            onClick={() => scroll('right')}
            className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="lg:flex gap-4 lg:overflow-x-auto lg:pb-4 lg:scrollbar-hide lg:snap-x lg:snap-mandatory grid grid-cols-1 md:grid-cols-2 gap-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {restaurants.map((restaurant) => (
          <div 
            key={restaurant.id}
            onClick={() => onSelect(restaurant)}
            className="lg:flex-none lg:w-72 lg:snap-start w-full group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100"
          >
            <div className="relative h-40 overflow-hidden">
              <img 
                src={restaurant.image} 
                alt={restaurant.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 bg-secondary text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm">
                Mismo precio que en local
              </div>
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-bold">{restaurant.rating}</span>
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-bold text-gray-900 font-display leading-tight mb-1 truncate">{restaurant.name}</h3>
              <p className="text-sm text-gray-500 mb-3 truncate">{restaurant.cuisine}</p>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span className="font-bold">{restaurant.deliveryTime}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-medium">San Pedro de Macorís</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RestaurantList;
