// Equipment Store page

import { useEffect, useState } from 'react';
import { ShoppingCart, Coins } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { PanelChrome } from '../components/ui/PanelChrome';

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
      case 'starter': return 'border-nina-border';
      case 'mid_range': return 'border-nebula-blue';
      case 'professional': return 'border-nebula-purple';
      case 'premium': return 'border-star-gold';
      default: return 'border-nina-border';
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'starter': return 'bg-nina-border text-nina-text-dim';
      case 'mid_range': return 'bg-nebula-blue/20 text-nebula-blue';
      case 'professional': return 'bg-nebula-purple/20 text-nebula-purple';
      case 'premium': return 'bg-star-gold/20 text-star-gold';
      default: return 'bg-nina-border text-nina-text-dim';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-nina-text-bright">Equipment Store</h1>
          <p className="text-xs text-nina-text-dim">Upgrade your gear to improve image quality</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-nina-surface rounded border border-nina-border">
          <Coins size={14} className="text-star-gold" />
          <span className="text-lg font-bold text-nina-text-bright">
            {(progress?.credits ?? 0).toLocaleString()}
          </span>
          <span className="text-xs text-nina-text-dim">credits</span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-nina-primary text-nina-text-bright'
                : 'bg-nina-elevated text-nina-text-dim hover:bg-nina-surface hover:text-nina-text'
            }`}
          >
            {cat === 'all' ? 'All Equipment' : cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredEquipment?.map((item) => {
          const owned = isOwned(item.id);
          const affordable = canAfford(item.price);

          return (
            <div
              key={item.id}
              className={`bg-nina-surface rounded p-4 border-2 ${getTierColor(item.tier)} ${
                owned ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-nina-text-bright text-sm">{item.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${getTierBadgeColor(item.tier)}`}>
                      {item.tier.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-nina-text-dim capitalize">{item.type.replace('_', ' ')}</span>
                  </div>
                </div>
                {owned && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-success/20 text-success rounded">Owned</span>
                )}
              </div>

              <p className="text-xs text-nina-text-dim mb-3">{item.description}</p>

              {item.specs && Object.keys(item.specs).length > 0 && (
                <div className="mb-3 p-2 bg-nina-elevated rounded">
                  <div className="text-[10px] text-nina-text-dim mb-1">Specifications</div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    {Object.entries(item.specs).slice(0, 4).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-nina-text-dim">{key.replace('_', ' ')}: </span>
                        <span className="text-nina-text">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Coins size={12} className="text-star-gold" />
                  <span className={`font-bold text-sm ${affordable ? 'text-nina-text-bright' : 'text-error'}`}>
                    {item.price.toLocaleString()}
                  </span>
                </div>
                {!owned && (
                  <button
                    onClick={() => handlePurchase(item.id)}
                    disabled={!affordable || purchasing === item.id}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                      affordable
                        ? 'bg-nina-primary text-nina-text-bright hover:bg-nina-active'
                        : 'bg-nina-border text-nina-text-dim cursor-not-allowed'
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
        <PanelChrome title="Your Equipment" icon={<ShoppingCart size={12} />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ownedEquipment.map((item) => (
              <div key={item.id} className="p-2 bg-nina-elevated rounded border border-nina-border">
                <div className="text-xs font-medium text-nina-text-bright">{item.name}</div>
                <div className="text-[10px] text-nina-text-dim capitalize">{item.type.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </PanelChrome>
      )}
    </div>
  );
}
