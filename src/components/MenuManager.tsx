import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, Upload, Save, X, Eye, EyeOff, DollarSign } from 'lucide-react';
import DataService from '../services/DataService';
import { useAuth } from '../contexts/AuthContext';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isActive: boolean;
  isAvailable: boolean;
}

const MenuManager: React.FC = () => {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    image: '',
    isActive: true,
    isAvailable: true
  });

  const categories = ['Platos Típicos', 'Pizzas', 'Bebidas', 'Postres', 'Ensaladas', 'Sopas'];

  // Cargar menú del negocio actual desde DataService
  useEffect(() => {
    const loadMenu = () => {
      if (user?.role === 'business') {
        const businesses = DataService.getBusinesses();
        const business = businesses.find(b => b.email === user.email);
        if (business && business.menu) {
          // Convertir el menú del formato del DataService al formato del MenuManager
          const convertedMenu: MenuItem[] = business.menu.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            price: item.price,
            category: item.category || 'General',
            image: item.image || 'https://picsum.photos/seed/default/300/200',
            isActive: item.available !== false,
            isAvailable: item.available !== false
          }));
          setMenuItems(convertedMenu);
        }
      }
    };

    loadMenu();
    const unsubscribe = DataService.subscribe(loadMenu);
    
    return unsubscribe;
  }, [user]);

  // Guardar menú en el DataService
  const saveMenuToDataService = (updatedMenu: MenuItem[]) => {
    if (user?.role === 'business') {
      const businesses = DataService.getBusinesses();
      const businessIndex = businesses.findIndex(b => b.email === user.email);
      
      if (businessIndex !== -1) {
        // Convertir al formato del DataService
        const convertedMenu = updatedMenu.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          image: item.image,
          available: item.isAvailable && item.isActive
        }));
        
        businesses[businessIndex].menu = convertedMenu;
        DataService.saveBusinesses(businesses);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, item?: MenuItem) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        if (item) {
          setEditingItem({ ...item, image: imageUrl });
        } else {
          setNewItem({ ...newItem, image: imageUrl });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = () => {
    if (editingItem) {
      const updatedMenu = menuItems.map(item => 
        item.id === editingItem.id ? editingItem : item
      );
      setMenuItems(updatedMenu);
      saveMenuToDataService(updatedMenu);
      setEditingItem(null);
    }
  };

  const handleAddNew = () => {
    if (newItem.name && newItem.price && newItem.category) {
      const item: MenuItem = {
        id: Date.now().toString(),
        name: newItem.name,
        description: newItem.description || '',
        price: newItem.price,
        category: newItem.category,
        image: newItem.image || 'https://picsum.photos/seed/default/300/200',
        isActive: newItem.isActive || true,
        isAvailable: newItem.isAvailable || true
      };
      const updatedMenu = [...menuItems, item];
      setMenuItems(updatedMenu);
      saveMenuToDataService(updatedMenu);
      setNewItem({
        name: '',
        description: '',
        price: 0,
        category: '',
        image: '',
        isActive: true,
        isAvailable: true
      });
      setIsAddingNew(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      const updatedMenu = menuItems.filter(item => item.id !== id);
      setMenuItems(updatedMenu);
      saveMenuToDataService(updatedMenu);
    }
  };

  const toggleActive = (id: string) => {
    const updatedMenu = menuItems.map(item => 
      item.id === id ? { ...item, isActive: !item.isActive } : item
    );
    setMenuItems(updatedMenu);
    saveMenuToDataService(updatedMenu);
  };

  const toggleAvailable = (id: string) => {
    const updatedMenu = menuItems.map(item => 
      item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
    );
    setMenuItems(updatedMenu);
    saveMenuToDataService(updatedMenu);
  };

  const activeItems = menuItems.filter(item => item.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black font-display text-gray-900">Gestión de Menú</h2>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          AGREGAR PRODUCTO
        </button>
      </div>

      {/* Formulario para agregar nuevo producto */}
      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Nuevo Producto</h3>
              <button
                onClick={() => setIsAddingNew(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nombre</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20"
                  placeholder="Nombre del producto"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Precio</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">RD$</span>
                  <input
                    type="number"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-12 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Categoría</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Imagen</label>
                <div className="mt-1">
                  <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary transition-colors">
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {newItem.image ? 'Cambiar imagen' : 'Subir imagen'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Descripción</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-primary/20"
                  rows={2}
                  placeholder="Descripción del producto"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddNew}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all"
                >
                  <Save className="w-4 h-4" />
                  GUARDAR PRODUCTO
                </button>
                <button
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 rounded-xl font-bold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                >
                  CANCELAR
                </button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de productos */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-gray-400">
            {activeItems.length} productos activos
          </span>
          <span className="text-sm font-bold text-gray-400">
            {menuItems.filter(item => item.isAvailable).length} disponibles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              className={`bg-white rounded-2xl shadow-sm border overflow-hidden group ${
                item.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60'
              }`}
            >
              {editingItem?.id === item.id ? (
                // Modo edición
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      className="font-bold text-lg bg-transparent border-b border-primary focus:outline-none"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={handleSaveEdit}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingItem(null)}
                        className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={editingItem.price}
                      onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                      className="p-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="Precio"
                    />
                    <select
                      value={editingItem.category}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="p-2 border border-gray-200 rounded-lg text-sm"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <textarea
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm resize-none"
                    rows={2}
                  />
                </div>
              ) : (
                // Modo vista
                <>
                  <div className="relative h-40 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">NO DISPONIBLE</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => toggleActive(item.id)}
                        className={`p-1.5 rounded-lg backdrop-blur-sm ${
                          item.isActive ? 'bg-emerald-500/90 text-white' : 'bg-gray-500/90 text-white'
                        }`}
                      >
                        {item.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-colors"
                      >
                        <Edit2 className="w-3 h-3 text-gray-700" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 bg-red-500/90 backdrop-blur-sm rounded-lg hover:bg-red-600/90 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-gray-900 text-sm">{item.name}</h4>
                      <span className="font-bold text-primary text-sm">RD$ {item.price}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{item.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                        {item.category}
                      </span>
                      <button
                        onClick={() => toggleAvailable(item.id)}
                        className={`text-xs px-2 py-1 rounded-lg font-bold transition-colors ${
                          item.isAvailable 
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {item.isAvailable ? 'DISPONIBLE' : 'AGOTADO'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuManager;
