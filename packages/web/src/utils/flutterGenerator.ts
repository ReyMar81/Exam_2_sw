import { Node, Edge } from "reactflow";
import type { Field, TableData } from "@shared/types";
import JSZip from "jszip";
import { classifyTable, shouldGenerateCRUD, needsCompositeKey, type TableKind } from "./relationUtils";

/**
 * Modelo de diagrama para generación de código
 */
interface DiagramModel {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Metadata de una tabla procesada
 */
interface TableMetadata {
  tableName: string;
  className: string;
  fields: Field[];
  primaryKey: Field | null;
  foreignKeys: Field[];
  tableKind: TableKind;
  needsCompositeKey: boolean;
}

/**
 * Genera un proyecto Flutter completo desde un diagrama ER
 * @param model - Modelo del diagrama (nodes y edges)
 * @param projectName - Nombre del proyecto (usado para paquetes y ZIP)
 * @returns Buffer del archivo ZIP con el proyecto completo
 */
export async function generateFlutterProject(
  model: DiagramModel,
  projectName: string
): Promise<Uint8Array> {
  const zip = new JSZip();
  const tableNodes = model.nodes.filter(n => n.type === 'table');
  
  if (tableNodes.length === 0) {
    throw new Error("No hay tablas en el diagrama");
  }

  const sanitizedProjectName = projectName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const baseDir = `${sanitizedProjectName}_flutter`;

  // Analizar TODAS las tablas
  const allTablesMetadata = analyzeTablesMetadata(tableNodes);
  
  // Filtrar: solo generar CRUD para ENTITY y JOIN_ENRICHED (NO para JOIN_PURE)
  const tablesMetadata = allTablesMetadata.filter(t => shouldGenerateCRUD(t.tableKind));

  if (tablesMetadata.length === 0) {
    throw new Error("No hay tablas que generar (solo tablas intermedias puras)");
  }

  // Generar archivos raíz
  zip.file(`${baseDir}/pubspec.yaml`, generatePubspec(sanitizedProjectName));
  zip.file(`${baseDir}/README.md`, generateReadme(sanitizedProjectName, tablesMetadata));
  zip.file(`${baseDir}/analysis_options.yaml`, generateAnalysisOptions());
  zip.file(`${baseDir}/.gitignore`, generateGitignore());

  // Generar main.dart
  zip.file(`${baseDir}/lib/main.dart`, generateMainDart(tablesMetadata));

  // Generar models
  tablesMetadata.forEach(table => {
    zip.file(
      `${baseDir}/lib/models/${table.tableName}_model.dart`,
      generateModel(table)
    );
  });

  // Generar api_service.dart
  zip.file(
    `${baseDir}/lib/services/api_service.dart`,
    generateApiService(tablesMetadata)
  );

  // Generar providers
  tablesMetadata.forEach(table => {
    zip.file(
      `${baseDir}/lib/providers/${table.tableName}_provider.dart`,
      generateProvider(table)
    );
  });

  // Generar screens
  tablesMetadata.forEach(table => {
    zip.file(
      `${baseDir}/lib/screens/${table.tableName}_list_screen.dart`,
      generateListScreen(table, tablesMetadata)
    );
    zip.file(
      `${baseDir}/lib/screens/${table.tableName}_form_screen.dart`,
      generateFormScreen(table)
    );
  });

  return await zip.generateAsync({ type: "uint8array" });
}

/**
 * Analiza metadata de tablas usando la lógica centralizada de clasificación
 */
function analyzeTablesMetadata(nodes: Node[]): TableMetadata[] {
  return nodes.map(node => {
    const data = node.data as TableData;
    const tableName = (data.name || data.label || "tabla").toLowerCase().replace(/\s+/g, '_');
    const className = toPascalCase(tableName);
    const fields = data.fields || [];
    
    // Usar clasificación centralizada
    const classification = classifyTable(fields);
    const primaryKey = classification.primaryKey;
    const foreignKeys = classification.foreignKeys;
    const tableKind = classification.kind;
    const needsCompKey = needsCompositeKey(classification);

    return {
      tableName,
      className,
      fields,
      primaryKey,
      foreignKeys,
      tableKind,
      needsCompositeKey: needsCompKey
    };
  });
}

/**
 * Genera pubspec.yaml
 */
function generatePubspec(projectName: string): string {
  return `name: ${projectName}
description: Frontend Flutter generado automáticamente desde Exam_2_sw
publish_to: 'none'

version: 1.0.0+1

environment:
  sdk: ">=3.0.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  provider: ^6.1.0
  http: ^1.2.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
`;
}

/**
 * Genera analysis_options.yaml
 */
function generateAnalysisOptions(): string {
  return `include: package:flutter_lints/flutter.yaml

linter:
  rules:
    prefer_const_constructors: false
    prefer_const_literals_to_create_immutables: false
`;
}

/**
 * Genera .gitignore
 */
function generateGitignore(): string {
  return `# Flutter/Dart
.dart_tool/
.packages
build/
.flutter-plugins
.flutter-plugins-dependencies
.pub-cache/
.pub/

# Android
*.iml
.gradle
local.properties
.idea/

# iOS
*.pbxuser
*.mode1v3
*.mode2v3
*.perspectivev3
*.xcuserstate
Pods/

# Misc
*.log
*.swp
.DS_Store
`;
}

/**
 * Genera README.md
 */
function generateReadme(projectName: string, tables: TableMetadata[]): string {
  return `# ${projectName} - Flutter Frontend

Aplicación Flutter generada automáticamente desde diagrama ER por **Exam_2_sw**.

## 🚀 Inicio Rápido

### Instalación

\`\`\`bash
flutter pub get
\`\`\`

### Ejecución

\`\`\`bash
flutter run
\`\`\`

Para web:
\`\`\`bash
flutter run -d chrome
\`\`\`

---

## 📱 Características

- ✅ CRUD completo para todas las entidades
- ✅ **Modo local** con datos mock (por defecto)
- ✅ **Modo backend** conectable a Spring Boot
- ✅ Material Design 3
- ✅ Gestión de estado con Provider
- ✅ Null safety habilitado

---

## 🗄️ Entidades Generadas

${tables.map(t => `- **${t.className}** (\`${t.tableName}\`)`).join('\n')}

---

## ⚙️ Configuración de Datos

### Modo Local (Por Defecto)

El proyecto viene configurado para usar datos mock locales. Permite probar la app inmediatamente sin backend.

Archivo: \`lib/services/api_service.dart\`

\`\`\`dart
const bool useBackend = false; // ✅ Modo local activo
\`\`\`

### Conectar a Backend Spring Boot

1. Edita \`lib/services/api_service.dart\`:

\`\`\`dart
const bool useBackend = true;
const String baseUrl = "http://localhost:8080"; // Puerto del backend
\`\`\`

2. Asegúrate de que el backend Spring Boot esté corriendo:

\`\`\`bash
cd ../backend
mvn spring-boot:run
# o
docker compose up --build
\`\`\`

3. Ejecuta la app Flutter normalmente:

\`\`\`bash
flutter run
\`\`\`

---

## 📁 Estructura del Proyecto

\`\`\`
lib/
├── main.dart                    # Punto de entrada, rutas
├── models/                      # Modelos de datos
${tables.map(t => `│   ├── ${t.tableName}_model.dart`).join('\n')}
├── services/
│   └── api_service.dart         # Servicio HTTP + mock
├── providers/                   # Estado con Provider
${tables.map(t => `│   ├── ${t.tableName}_provider.dart`).join('\n')}
└── screens/                     # Pantallas UI
${tables.map(t => `    ├── ${t.tableName}_list_screen.dart\n    ├── ${t.tableName}_form_screen.dart`).join('\n')}
\`\`\`

---

## 🧪 Endpoints del Backend

Cuando \`useBackend = true\`, la app consume estos endpoints:

${tables.map(t => `
**${t.className}:**
- \`GET /${t.tableName}\` - Listar todos
- \`GET /${t.tableName}/{id}\` - Obtener por ID
- \`POST /${t.tableName}\` - Crear
- \`PUT /${t.tableName}/{id}\` - Actualizar
- \`DELETE /${t.tableName}/{id}\` - Eliminar
`).join('\n')}

---

## 📝 Generado por

**Exam_2_sw** - Sistema de diagramas ER colaborativo  
Exportación automática: Flutter 3.0 + Material Design 3 + Provider
`;
}

/**
 * Genera main.dart
 */
function generateMainDart(tables: TableMetadata[]): string {
  const firstTable = tables[0];

  const providers = tables.map(t => 
    `        ChangeNotifierProvider(create: (_) => ${t.className}Provider()),`
  ).join('\n');

  const routes = tables.map(t => 
    `        '/${t.tableName}': (context) => const ${t.className}ListScreen(),`
  ).join('\n');

  return `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
${tables.map(t => `import 'providers/${t.tableName}_provider.dart';`).join('\n')}
${tables.map(t => `import 'screens/${t.tableName}_list_screen.dart';`).join('\n')}

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
${providers}
      ],
      child: MaterialApp(
        title: 'Flutter App',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
          useMaterial3: true,
        ),
        initialRoute: '/${firstTable.tableName}',
        routes: {
${routes}
        },
      ),
    );
  }
}
`;
}

/**
 * Genera modelo Dart
 */
function generateModel(table: TableMetadata): string {
  const fields = table.fields.map(field => {
    const dartType = mapSqlToDartType(field.type);
    const isIdField = field.name.toLowerCase() === 'id' && field.isPrimary;
    const isForeignKey = field.isForeign || field.name.toLowerCase().endsWith('_id');
    
    // Regla de nullable:
    // - IDs autogenerados: nullable (int?)
    // - FKs: nullable (int?) a menos que la tabla sea JOIN_ENRICHED o JOIN_PURE
    // - Otros campos: basado en la definición de la columna
    let nullable = '';
    let isNullable = false;
    
    if (isIdField) {
      nullable = '?';
      isNullable = true;
    } else if (isForeignKey && table.tableKind === 'ENTITY') {
      // FKs en tablas normales son opcionales
      nullable = '?';
      isNullable = true;
    } else if (table.tableKind !== 'ENTITY' && isForeignKey) {
      // FKs en tablas JOIN (PURE o ENRICHED) NO son nullable
      nullable = '';
      isNullable = false;
    } else if (field.nullable) {
      nullable = '?';
      isNullable = true;
    }
    
    // Required: solo para campos no-nullable y no-primaryKey
    const required = !isNullable && !field.isPrimary ? 'required ' : '';
    
    return {
      name: toCamelCase(field.name),
      type: `${dartType}${nullable}`,
      required: required,
      originalName: field.name,
      isPrimary: field.isPrimary,
      isForeign: field.isForeign || field.name.toLowerCase().endsWith('_id'),
      isNullable: isNullable
    };
  });

  const classFields = fields.map(f => `  final ${f.type} ${f.name};`).join('\n');
  
  const constructorParams = fields.map(f => {
    return `${f.required}this.${f.name}`;
  }).join(', ');

  const fromJsonFields = fields.map(f => {
    const baseType = f.type.replace('?', '');
    if (baseType === 'int') {
      return `      ${f.name}: json['${f.originalName}'] as ${f.type},`;
    } else if (baseType === 'double') {
      return `      ${f.name}: (json['${f.originalName}'] as num?)?.toDouble(),`;
    } else if (baseType === 'bool') {
      return `      ${f.name}: json['${f.originalName}'] as ${f.type},`;
    } else if (baseType === 'DateTime') {
      return `      ${f.name}: json['${f.originalName}'] != null ? DateTime.parse(json['${f.originalName}']) : null,`;
    } else {
      return `      ${f.name}: json['${f.originalName}'] as ${f.type},`;
    }
  }).join('\n');

  const toJsonFields = fields.map(f => {
    if (f.type.includes('DateTime')) {
      return `      '${f.originalName}': ${f.name}?.toIso8601String(),`;
    } else {
      return `      '${f.originalName}': ${f.name},`;
    }
  }).join('\n');

  // Para copyWith, todos los parámetros son opcionales (nullable)
  const copyWithParams = fields.map(f => {
    const baseType = f.type.replace('?', '');
    return `    ${baseType}? ${f.name},`;
  }).join('\n');

  // Generar getCompositeKey para tablas que lo necesitan
  let compositeKeyMethod = '';
  if (table.needsCompositeKey && table.foreignKeys.length >= 2) {
    const fkNames = table.foreignKeys.slice(0, 2).map(fk => toCamelCase(fk.name));
    compositeKeyMethod = `\n  String getCompositeKey() => "\${${fkNames[0]}}_\${${fkNames[1]}}";`;
  }

  return `class ${table.className} {
${classFields}

  ${table.className}({${constructorParams}});

  factory ${table.className}.fromJson(Map<String, dynamic> json) {
    return ${table.className}(
${fromJsonFields}
    );
  }

  Map<String, dynamic> toJson() {
    return {
${toJsonFields}
    };
  }

  ${table.className} copyWith({
${copyWithParams}
  }) {
    return ${table.className}(
${fields.map(f => `      ${f.name}: ${f.name} ?? this.${f.name},`).join('\n')}
    );
  }${compositeKeyMethod}
}
`;
}

/**
 * Genera ApiService
 */
function generateApiService(tables: TableMetadata[]): string {
  const mockData = tables.map(table => {
    const sampleData = generateSampleData(table);
    return `  // Mock data para ${table.className}
  static List<Map<String, dynamic>> _${table.tableName}Mock = ${JSON.stringify(sampleData, null, 4)};`;
  }).join('\n\n');

  const methods = tables.map(table => {
    const pkField = table.primaryKey?.name || 'id';
    const isJoinTable = table.needsCompositeKey;
    
    if (isJoinTable) {
      const fk1Name = table.foreignKeys[0].name;
      const fk2Name = table.foreignKeys[1].name;
      
      return `
  // ==================== ${table.className} (Tabla Intermedia) ====================
  
  static Future<List<Map<String, dynamic>>> fetch${table.className}s() async {
    if (!useBackend) {
      await Future.delayed(const Duration(milliseconds: 300));
      return List<Map<String, dynamic>>.from(_${table.tableName}Mock);
    }

    final response = await http.get(Uri.parse('$baseUrl/${table.tableName}'));
    if (response.statusCode == 200) {
      return List<Map<String, dynamic>>.from(json.decode(response.body));
    } else {
      throw Exception('Error al cargar ${table.tableName}');
    }
  }

  static Future<Map<String, dynamic>> create${table.className}(Map<String, dynamic> data) async {
    if (!useBackend) {
      await Future.delayed(const Duration(milliseconds: 300));
      _${table.tableName}Mock.add(data);
      return data;
    }

    final response = await http.post(
      Uri.parse('$baseUrl/${table.tableName}'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(data),
    );
    
    if (response.statusCode == 200 || response.statusCode == 201) {
      return json.decode(response.body);
    } else {
      throw Exception('Error al crear ${table.tableName}');
    }
  }

  static Future<Map<String, dynamic>> update${table.className}ByCompositeKey(String compositeKey, Map<String, dynamic> data) async {
    if (!useBackend) {
      await Future.delayed(const Duration(milliseconds: 300));
      final parts = compositeKey.split('_');
      final fk1Value = int.parse(parts[0]);
      final fk2Value = int.parse(parts[1]);
      final index = _${table.tableName}Mock.indexWhere((item) => 
        item['${fk1Name}'] == fk1Value && item['${fk2Name}'] == fk2Value
      );
      if (index != -1) {
        _${table.tableName}Mock[index] = data;
        return _${table.tableName}Mock[index];
      }
      throw Exception('${table.className} no encontrado');
    }

    final response = await http.put(
      Uri.parse('$baseUrl/${table.tableName}/$compositeKey'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(data),
    );
    
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Error al actualizar ${table.tableName}');
    }
  }

  static Future<void> delete${table.className}ByCompositeKey(String compositeKey) async {
    if (!useBackend) {
      await Future.delayed(const Duration(milliseconds: 300));
      final parts = compositeKey.split('_');
      final fk1Value = int.parse(parts[0]);
      final fk2Value = int.parse(parts[1]);
      _${table.tableName}Mock.removeWhere((item) => 
        item['${fk1Name}'] == fk1Value && item['${fk2Name}'] == fk2Value
      );
      return;
    }

    final response = await http.delete(Uri.parse('$baseUrl/${table.tableName}/$compositeKey'));
    
    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Error al eliminar ${table.tableName}');
    }
  }`;
    } else {
      return `
  // ==================== ${table.className} ====================
  
  static Future<List<Map<String, dynamic>>> fetch${table.className}s() async {
    if (!useBackend) {
      await Future.delayed(const Duration(milliseconds: 300));
      return List<Map<String, dynamic>>.from(_${table.tableName}Mock);
    }

    final response = await http.get(Uri.parse('$baseUrl/${table.tableName}'));
    if (response.statusCode == 200) {
      return List<Map<String, dynamic>>.from(json.decode(response.body));
    } else {
      throw Exception('Error al cargar ${table.tableName}');
    }
  }

  static Future<Map<String, dynamic>> create${table.className}(Map<String, dynamic> data) async {
    if (!useBackend) {
      await Future.delayed(const Duration(milliseconds: 300));
      final newId = _${table.tableName}Mock.isEmpty ? 1 : (_${table.tableName}Mock.map((e) => e['${pkField}'] as int).reduce((a, b) => a > b ? a : b) + 1);
      final newItem = {...data, '${pkField}': newId};
      _${table.tableName}Mock.add(newItem);
      return newItem;
    }

    final response = await http.post(
      Uri.parse('$baseUrl/${table.tableName}'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(data),
    );
    
    if (response.statusCode == 200 || response.statusCode == 201) {
      return json.decode(response.body);
    } else {
      throw Exception('Error al crear ${table.tableName}');
    }
  }

  static Future<Map<String, dynamic>> update${table.className}(int id, Map<String, dynamic> data) async {
    if (!useBackend) {
      await Future.delayed(const Duration(milliseconds: 300));
      final index = _${table.tableName}Mock.indexWhere((item) => item['${pkField}'] == id);
      if (index != -1) {
        _${table.tableName}Mock[index] = {...data, '${pkField}': id};
        return _${table.tableName}Mock[index];
      }
      throw Exception('${table.className} no encontrado');
    }

    final response = await http.put(
      Uri.parse('$baseUrl/${table.tableName}/$id'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(data),
    );
    
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Error al actualizar ${table.tableName}');
    }
  }

  static Future<void> delete${table.className}(int id) async {
    if (!useBackend) {
      await Future.delayed(const Duration(milliseconds: 300));
      _${table.tableName}Mock.removeWhere((item) => item['${pkField}'] == id);
      return;
    }

    final response = await http.delete(Uri.parse('$baseUrl/${table.tableName}/$id'));
    
    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Error al eliminar ${table.tableName}');
    }
  }`;
    }
  }).join('\n');

  return `import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Configuración de modo
  static const bool useBackend = false; // Cambiar a true para usar backend real
  static const String baseUrl = "http://localhost:8080"; // Cambiar a URL del backend Spring Boot

${mockData}

${methods}
}
`;
}

/**
 * Genera datos de ejemplo para mock
 */
function generateSampleData(table: TableMetadata): any[] {
  const pkField = table.primaryKey?.name || 'id';
  
  return [1, 2].map(id => {
    const item: any = {};
    table.fields.forEach(field => {
      if (field.isPrimary && field.name.toLowerCase() === 'id') {
        // IDs autogenerados
        item[field.name] = id;
      } else if (field.isForeign) {
        // FKs: usar valores válidos (asumimos que existen registros 1 y 2)
        item[field.name] = id;
      } else {
        const dartType = mapSqlToDartType(field.type);
        if (dartType === 'String') {
          item[field.name] = `${field.name}_${id}`;
        } else if (dartType === 'int') {
          item[field.name] = id * 10;
        } else if (dartType === 'double') {
          item[field.name] = id * 10.5;
        } else if (dartType === 'bool') {
          item[field.name] = id % 2 === 0;
        } else if (dartType === 'DateTime') {
          item[field.name] = new Date().toISOString();
        }
      }
    });
    return item;
  });
}

/**
 * Genera Provider
 */
function generateProvider(table: TableMetadata): string {
  const pkField = toCamelCase(table.primaryKey?.name || 'id');
  
  // Para tablas intermedias, usar clave compuesta
  let findIndexLogic = '';
  let deleteWhereLogic = '';
  
  if (table.needsCompositeKey) {
    const fk1 = toCamelCase(table.foreignKeys[0].name);
    const fk2 = toCamelCase(table.foreignKeys[1].name);
    findIndexLogic = `_items.indexWhere((i) => i.${fk1} == item.${fk1} && i.${fk2} == item.${fk2})`;
    deleteWhereLogic = `_items.removeWhere((item) => item.getCompositeKey() == compositeKey)`;
  } else {
    findIndexLogic = `_items.indexWhere((i) => i.${pkField} == pkValue)`;
    deleteWhereLogic = `_items.removeWhere((item) => item.${pkField} == id)`;
  }

  const updateMethod = table.needsCompositeKey ? `
  Future<void> update(${table.className} item) async {
    try {
      final compositeKey = item.getCompositeKey();
      final data = await ApiService.update${table.className}ByCompositeKey(compositeKey, item.toJson());
      final index = ${findIndexLogic};
      if (index != -1) {
        _items[index] = ${table.className}.fromJson(data);
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }` : `
  Future<void> update(${table.className} item) async {
    try {
      final pkValue = item.${pkField};
      if (pkValue == null) throw Exception('ID no puede ser nulo');
      
      final data = await ApiService.update${table.className}(pkValue, item.toJson());
      final index = ${findIndexLogic};
      if (index != -1) {
        _items[index] = ${table.className}.fromJson(data);
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }`;

  const deleteMethod = table.needsCompositeKey ? `
  Future<void> delete(String compositeKey) async {
    try {
      await ApiService.delete${table.className}ByCompositeKey(compositeKey);
      ${deleteWhereLogic};
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }` : `
  Future<void> delete(int id) async {
    try {
      await ApiService.delete${table.className}(id);
      ${deleteWhereLogic};
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }`;

  return `import 'package:flutter/material.dart';
import '../models/${table.tableName}_model.dart';
import '../services/api_service.dart';

class ${table.className}Provider with ChangeNotifier {
  List<${table.className}> _items = [];
  bool _isLoading = false;
  String? _error;

  List<${table.className}> get items => _items;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchAll() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await ApiService.fetch${table.className}s();
      _items = data.map((json) => ${table.className}.fromJson(json)).toList();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> create(${table.className} item) async {
    try {
      final data = await ApiService.create${table.className}(item.toJson());
      _items.add(${table.className}.fromJson(data));
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }
${updateMethod}
${deleteMethod}
}
`;
}

/**
 * Genera pantalla de lista
 */
function generateListScreen(table: TableMetadata, allTables: TableMetadata[]): string {
  const pkField = toCamelCase(table.primaryKey?.name || 'id');
  const displayFields = table.fields.filter(f => !f.isPrimary).slice(0, 3);
  const isJoinTable = table.needsCompositeKey;
  
  // Lógica de eliminación
  let deleteCall = '';
  if (isJoinTable) {
    deleteCall = `await provider.delete(item.getCompositeKey());`;
  } else {
    deleteCall = `if (item.${pkField} != null) {
                              await provider.delete(item.${pkField}!);
                            }`;
  }

  // Generar items del drawer para navegación
  const drawerItems = allTables.map(t => {
    const icon = t.tableKind === 'ENTITY' ? 'table_chart' : 'link';
    const isCurrentScreen = t.tableName === table.tableName;
    return `            ListTile(
              leading: Icon(Icons.${icon}, color: ${isCurrentScreen ? 'Colors.deepPurple' : 'Colors.grey[600]'}),
              title: Text(
                '${t.className}',
                style: TextStyle(
                  fontWeight: ${isCurrentScreen ? 'FontWeight.bold' : 'FontWeight.normal'},
                  color: ${isCurrentScreen ? 'Colors.deepPurple' : 'Colors.black87'},
                ),
              ),
              selected: ${isCurrentScreen},
              selectedTileColor: Colors.deepPurple.withOpacity(0.1),
              onTap: ${isCurrentScreen ? 'null' : `() {
                Navigator.pushReplacementNamed(context, '/${t.tableName}');
              }`},
            ),`;
  }).join('\n');
  
  return `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/${table.tableName}_provider.dart';
import '../models/${table.tableName}_model.dart';
import '${table.tableName}_form_screen.dart';

class ${table.className}ListScreen extends StatefulWidget {
  const ${table.className}ListScreen({super.key});

  @override
  State<${table.className}ListScreen> createState() => _${table.className}ListScreenState();
}

class _${table.className}ListScreenState extends State<${table.className}ListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<${table.className}Provider>().fetchAll();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('${table.className}s'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.deepPurple, Colors.deepPurple.shade300],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Icon(Icons.dashboard, size: 48, color: Colors.white),
                  SizedBox(height: 8),
                  Text(
                    'Navegación',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'Entidades del sistema',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                'ENTIDADES',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[600],
                  letterSpacing: 1.2,
                ),
              ),
            ),
${drawerItems}
            Divider(),
            ListTile(
              leading: Icon(Icons.info_outline, color: Colors.grey[600]),
              title: Text('Acerca de'),
              onTap: () {
                showAboutDialog(
                  context: context,
                  applicationName: 'Flutter App',
                  applicationVersion: '1.0.0',
                  applicationLegalese: 'Generado por Exam_2_sw',
                );
              },
            ),
          ],
        ),
      ),
      body: Consumer<${table.className}Provider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text('Error: \${provider.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => provider.fetchAll(),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }

          if (provider.items.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.inbox, size: 64, color: Colors.grey[400]),
                  SizedBox(height: 16),
                  Text(
                    'No hay registros',
                    style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Presiona + para agregar',
                    style: TextStyle(color: Colors.grey[500]),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: provider.fetchAll,
            child: ListView.builder(
              itemCount: provider.items.length,
              itemBuilder: (context, index) {
                final item = provider.items[index];
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  elevation: 2,
                  child: ListTile(
                    title: Text('${displayFields.length > 0 ? `\${item.${toCamelCase(displayFields[0].name)}}` : `ID: \${item.${pkField}}`}'),
                    subtitle: Text(${displayFields.length > 1 ? `'\${item.${toCamelCase(displayFields[1].name)}}'` : `'ID: \${item.${pkField}}'`}),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit, color: Colors.blue),
                          tooltip: 'Editar',
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ${table.className}FormScreen(item: item),
                              ),
                            );
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete, color: Colors.red),
                          tooltip: 'Eliminar',
                          onPressed: () async {
                            final confirm = await showDialog<bool>(
                              context: context,
                              builder: (context) => AlertDialog(
                                title: const Text('Confirmar eliminación'),
                                content: const Text('¿Está seguro de eliminar este registro?'),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(context, false),
                                    child: const Text('Cancelar'),
                                  ),
                                  TextButton(
                                    onPressed: () => Navigator.pop(context, true),
                                    style: TextButton.styleFrom(foregroundColor: Colors.red),
                                    child: const Text('Eliminar'),
                                  ),
                                ],
                              ),
                            );
                            
                            if (confirm == true) {
                              ${deleteCall}
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const ${table.className}FormScreen(),
            ),
          );
        },
        tooltip: 'Agregar nuevo',
        child: const Icon(Icons.add),
      ),
    );
  }
}
`;
}

/**
 * Genera pantalla de formulario
 */
function generateFormScreen(table: TableMetadata): string {
  const pkField = toCamelCase(table.primaryKey?.name || 'id');
  const editableFields = table.fields.filter(f => !f.isPrimary);
  const isJoinTable = table.needsCompositeKey;
  
  const controllers = editableFields.map(f => 
    `  final _${toCamelCase(f.name)}Controller = TextEditingController();`
  ).join('\n');

  const initState = editableFields.map(f => {
    const fieldName = toCamelCase(f.name);
    const dartType = mapSqlToDartType(f.type);
    if (dartType === 'String') {
      return `      _${fieldName}Controller.text = widget.item?.${fieldName} ?? '';`;
    } else {
      return `      _${fieldName}Controller.text = widget.item?.${fieldName}?.toString() ?? '';`;
    }
  }).join('\n');

  const dispose = editableFields.map(f => 
    `    _${toCamelCase(f.name)}Controller.dispose();`
  ).join('\n');

  const formFields = editableFields.map(f => {
    const fieldName = toCamelCase(f.name);
    const dartType = mapSqlToDartType(f.type);
    const label = f.name.replace(/_/g, ' ');
    
    if (dartType === 'bool') {
      return `          SwitchListTile(
            title: Text('${label}'),
            value: _${fieldName}Controller.text == 'true',
            onChanged: (value) {
              setState(() {
                _${fieldName}Controller.text = value.toString();
              });
            },
          ),`;
    } else if (dartType === 'int' || dartType === 'double') {
      return `          TextFormField(
            controller: _${fieldName}Controller,
            decoration: InputDecoration(
              labelText: '${label}',
              border: const OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
            validator: (value) {
              if (value == null || value.isEmpty) return 'Campo requerido';
              if (${dartType === 'int' ? 'int.tryParse(value)' : 'double.tryParse(value)'} == null) {
                return 'Ingrese un número válido';
              }
              return null;
            },
          ),`;
    } else {
      return `          TextFormField(
            controller: _${fieldName}Controller,
            decoration: InputDecoration(
              labelText: '${label}',
              border: const OutlineInputBorder(),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) return 'Campo requerido';
              return null;
            },
          ),`;
    }
  }).join('\n          const SizedBox(height: 16),\n');

  const buildData = editableFields.map(f => {
    const fieldName = toCamelCase(f.name);
    const dartType = mapSqlToDartType(f.type);
    
    if (dartType === 'int') {
      return `        '${f.name}': int.parse(_${fieldName}Controller.text),`;
    } else if (dartType === 'double') {
      return `        '${f.name}': double.parse(_${fieldName}Controller.text),`;
    } else if (dartType === 'bool') {
      return `        '${f.name}': _${fieldName}Controller.text == 'true',`;
    } else {
      return `        '${f.name}': _${fieldName}Controller.text,`;
    }
  }).join('\n');

  // Lógica de actualización para tablas intermedias vs normales
  let updateLogic = '';
  if (isJoinTable) {
    updateLogic = `
      if (widget.item != null) {
        // Actualizar (tablas intermedias no se actualizan, se eliminan y recrean)
        final updated = ${table.className}.fromJson(data);
        await provider.update(updated);
      } else {
        // Crear
        await provider.create(${table.className}.fromJson(data));
      }`;
  } else {
    const pkFieldOriginal = table.primaryKey?.name || 'id';
    updateLogic = `
      if (widget.item != null) {
        // Actualizar
        final updated = ${table.className}.fromJson({
          ...data,
          '${pkFieldOriginal}': widget.item!.${pkField},
        });
        await provider.update(updated);
      } else {
        // Crear
        await provider.create(${table.className}.fromJson(data));
      }`;
  }

  return `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/${table.tableName}_provider.dart';
import '../models/${table.tableName}_model.dart';

class ${table.className}FormScreen extends StatefulWidget {
  final ${table.className}? item;
  
  const ${table.className}FormScreen({super.key, this.item});

  @override
  State<${table.className}FormScreen> createState() => _${table.className}FormScreenState();
}

class _${table.className}FormScreenState extends State<${table.className}FormScreen> {
  final _formKey = GlobalKey<FormState>();
${controllers}

  @override
  void initState() {
    super.initState();
    if (widget.item != null) {
${initState}
    }
  }

  @override
  void dispose() {
${dispose}
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    try {
      final data = {
${buildData}
      };

      final provider = context.read<${table.className}Provider>();
      ${updateLogic}

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(widget.item != null ? 'Actualizado correctamente' : 'Creado correctamente')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: \$e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.item != null ? 'Editar ${table.className}' : 'Nuevo ${table.className}'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
${formFields}
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Colors.white,
                  ),
                  child: Text(widget.item != null ? 'Actualizar' : 'Crear'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
`;
}

/**
 * Mapea tipos SQL a tipos Dart
 */
function mapSqlToDartType(sqlType: string): string {
  const type = sqlType.toUpperCase();
  
  if (type.includes('INT') || type.includes('SERIAL')) return 'int';
  if (type.includes('VARCHAR') || type.includes('TEXT')) return 'String';
  if (type.includes('BOOLEAN') || type.includes('BOOL')) return 'bool';
  if (type.includes('DECIMAL') || type.includes('NUMERIC') || type.includes('FLOAT') || type.includes('REAL')) return 'double';
  if (type.includes('DATE') || type.includes('TIMESTAMP') || type.includes('TIME')) return 'DateTime';
  
  return 'String'; // Default
}

/**
 * Convierte snake_case a PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Convierte snake_case a camelCase
 */
function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Descarga el ZIP del proyecto Flutter
 */
export function downloadFlutterProject(zipBuffer: Uint8Array, projectName: string): void {
  const blob = new Blob([zipBuffer as any], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${projectName}_flutter.zip`;
  link.click();
  URL.revokeObjectURL(url);
}
