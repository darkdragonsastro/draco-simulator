# Draco Astrophotography Simulator

A dual-mode astrophotography application that serves as both an educational simulator AND a real equipment controller. Learn astrophotography through gamified simulation, then seamlessly transition to controlling real telescopes with the same interface.

## Vision

**Same UI, same workflow - just switch from virtual to real equipment.**

- **Simulation Mode**: Virtual devices simulate realistic equipment behavior with game mechanics (tutorials, challenges, progression, achievements)
- **Live Mode**: Connect to real equipment via INDI servers or ASCOM Alpaca

## Features

### Sky Simulation
- Real star catalogs (Hipparcos ~118K stars)
- Deep sky object catalogs (Messier, NGC, IC)
- Time-based visibility calculations
- Atmospheric simulation (seeing, transparency, sky glow)

### Game Mechanics
- **Progression**: XP, levels, and tiers (Beginner → Expert)
- **Virtual Currency**: Earn credits to unlock better equipment
- **Achievements**: Unlock badges for accomplishments
- **Challenges**: Tutorials and imaging challenges
- **Equipment Store**: Purchase virtual equipment upgrades
- **Image Scoring**: Automatic quality assessment with feedback

### Equipment Tiers
1. **Starter Kit** (Free): Basic camera, mount, focuser, scope
2. **Mid-Range** (5K-20K credits): Cooled cameras, EQ mounts, motorized focusers
3. **Professional** (50K+ credits): Low-noise sensors, high-precision mounts
4. **Premium** (Expert tier): Top-tier observatory equipment

## Getting Started

### Build

```bash
make build
```

### Run

```bash
make run
# or
./bin/draco-simulator
```

### Test

```bash
make test
```

## Project Structure

```
draco-simulator/
├── cmd/server/          # Main entry point
├── internal/
│   ├── catalog/         # Star and DSO catalogs
│   ├── game/            # Game service (progression, achievements, challenges)
│   ├── eventbus/        # Event-driven messaging
│   ├── database/        # Persistence
│   └── api/             # REST API handlers (coming soon)
└── docs/                # Documentation
```

## API (Coming Soon)

- `GET /api/v1/game/progress` - Player progression
- `GET /api/v1/game/achievements` - Achievements
- `GET /api/v1/game/challenges` - Available challenges
- `GET /api/v1/game/store` - Equipment store
- `GET /api/v1/catalog/stars` - Star catalog search
- `GET /api/v1/catalog/dso` - DSO catalog search
- `GET /api/v1/sky/conditions` - Sky simulation

## License

MIT License - See LICENSE file for details.

## Contributing

Contributions welcome! Please read CONTRIBUTING.md for guidelines.
