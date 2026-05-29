# Разбиение химии на Слой A и Слой B (5000 молекул)

## Цель
Разделить chemistry_molecules_5000 на два слоя доставки без потери покрытия: итоговый объем остается 5000 молекул.

## Пакеты
- Слой A: chemistry_molecules_layer_a (/root/synapse/content_packs/chemistry_molecules_layer_a_v1.json)
- Слой B: chemistry_molecules_layer_b (/root/synapse/content_packs/chemistry_molecules_layer_b_v1.json)
- Манифест: /root/synapse/content_packs/chemistry_molecules_layers_manifest_v1.json

## Правила разбиения
- Источник: chemistry_molecules_5000_v1.json
- Подтвержденный total: 5000 молекул
- Размер слоя A: 2500
- Размер слоя B: 2500
- Пропорционально по веткам + в слой A сначала менее сложные молекулы (по числу атомов)

## Распределение по веткам
- Слой A: biochemistry 390, general 961, inorganic 248, organic 901
- Слой B: biochemistry 391, general 961, inorganic 249, organic 899

## Интеграция в mobile
Файл: /root/synapse/mobile/app/services/contentUpdateService.ts
- chemistry_pack
- chemistry_molecules_layer_a
- chemistry_molecules_layer_b

## Примечания
- Это разбиение доставки, а не удаление данных: A + B = исходные 5000.
- Рекомендованный порядок загрузки: сначала Слой A, затем Слой B.
