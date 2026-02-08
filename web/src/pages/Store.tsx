// Equipment Store page

import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';

export function Store() {
  const { store, ownedEquipment, fetchStore, purchaseEquipment, progress } = useGameStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  const categories = ['all', 'camera', 'mount', 'focuser', 'telescope', 'filter_wheel'];

  const filteredEquipment = store?.equipment.filter(
    (item) => selectedCategory === 'all' || item.type === selectedCategory
  );

  const isOwned = (id: string) => store?.owned.includes(id);
  const canAfford = (price: number) => (progress?.credits ?? 0) >= price;

  const handlePurchase = async (id: string) => {
    setPurchasing(id);
    await purchaseEquipment(id);
    setPurchasing(null);
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'starter':
        return 'border-gray-500';
      case 'mid_range':
        return 'border-nebula-blue';
      case 'professional':
        return 'border-nebula-purple';
      case 'premium':
        return 'border-star-gold';
      default:
        return 'border-gray-600';
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'starter':
        return 'bg-gray-600';
      case 'mid_range':
        return 'bg-nebula-blue/20 text-nebula-blue';
      case 'professional':
        return 'bg-nebula-purple/20 text-nebula-purple';
      case 'premium':
        return 'bg-star-gold/20 text-star-gold';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Equipment Store</h1>
          <p className="text-gray-400">Upgrade your gear to improve image quality</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-space-800 rounded-lg">
          <span className="text-star-gold">💰</span>
          <span className="text-xl font-bold text-white">
            {(progress?.credits ?? 0).toLocaleString()}
          </span>
          <span className="text-sm text-gray-400">credits</span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-nebula-purple text-white'
                : 'bg-space-700 text-gray-400 hover:bg-space-600'
            }`}
          >
            {cat === 'all' ? 'All Equipment' : cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEquipment?.map((item) => {
          const owned = isOwned(item.id);
          const affordable = canAfford(item.price);

          return (
            <div
              key={item.id}
              className={`bg-space-800 rounded-xl p-5 border-2 ${getTierColor(item.tier)} ${
                owned ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{item.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded capitalize ${getTierBadgeColor(item.tier)}`}
                    >
                      {item.tier.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {item.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                {owned && (
                  <span className="text-xs px-2 py-1 bg-success/20 text-success rounded">Owned</span>
                )}
              </div>

              <p className="text-sm text-gray-400 mb-4">{item.description}</p>

              {/* Specs */}
              {item.specs && Object.keys(item.specs).length > 0 && (
                <div className="mb-4 p-3 bg-space-700 rounded-lg">
                  <div className="text-xs text-gray-500 mb-2">Specifications</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(item.specs).slice(0, 4).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-gray-400">{key.replace('_', ' ')}: </span>
                        <span className="text-white">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-star-gold">💰</span>
                  <span className={`font-bold ${affordable ? 'text-white' : 'text-error'}`}>
                    {item.price.toLocaleString()}
                  </span>
                </div>
                {!owned && (
                  <button
                    onClick={() => handlePurchase(item.id)}
                    disabled={!affordable || purchasing === item.id}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      affordable
                        ? 'bg-nebula-purple hover:bg-opacity-80'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {purchasing === item.id ? 'Purchasing...' : affordable ? 'Purchase' : 'Not enough'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Owned Equipment Section */}
      {ownedEquipment.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Your Equipment</h2>
          <div className="bg-space-800 rounded-xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ownedEquipment.map((item) => (
                <div key={item.id} className="p-3 bg-space-700 rounded-lg">
                  <div className="text-sm font-medium text-white">{item.name}</div>
                  <div className="text-xs text-gray-400 capitalize">
                    {item.type.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
