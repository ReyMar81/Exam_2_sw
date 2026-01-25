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
  parentTable?: string;   // 🎯 Nombre de la tabla padre (para herencia)
  parentClass?: string;   // 🎯 Nombre de la clase padre (para herencia)
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
  const allTablesMetadata = analyzeTablesMetadata(tableNodes, model.edges);
  
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
      generateModel(table, tablesMetadata)
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
      generateProvider(table, tablesMetadata)
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
      generateFormScreen(table, tablesMetadata)
    );
  });

  return await zip.generateAsync({ type: "uint8array" });
}

/**
 * Analiza metadata de tablas con DETECCIÓN DIRECTA DE HERENCIA desde edges
 * (igual que Spring Boot - sin intentar propagar relationType a campos)
 */
function analyzeTablesMetadata(nodes: Node[], edges: Edge[]): TableMetadata[] {
  // 🎯 Construir un mapa de herencias directamente desde los edges (COMO SPRING BOOT)
  const inheritanceMap = new Map<string, string>(); // childTable -> parentTable
  
  edges.forEach(edge => {
    const edgeData = edge.data as any;
    
    if (edgeData?.relationType === 'INHERITANCE') {
      // En UML: la flecha apunta al padre (source hereda de target)
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const sourceTable = ((sourceNode.data as any).name || '').toLowerCase().replace(/\s+/g, '_');
        const targetTable = ((targetNode.data as any).name || '').toLowerCase().replace(/\s+/g, '_');
        inheritanceMap.set(sourceTable, targetTable);
        console.log(`🔺 [Flutter Inheritance] ${sourceTable} extends ${targetTable}`);
      }
    }
  });
  
  return nodes.map(node => {
    const data = node.data as TableData;
    const tableName = (data.name || data.label || "tabla").toLowerCase().replace(/\s+/g, '_');
    const className = toPascalCase(tableName);
    
    // 🚫 Filtrar métodos (isMethod = true) ya que no son campos de BD
    let fields = (data.fields || []).filter(f => !f.isMethod);
    
    // Usar clasificación centralizada
    const classification = classifyTable(fields);
    const primaryKey = classification.primaryKey;
    const foreignKeys = classification.foreignKeys;
    const tableKind = classification.kind;
    const needsCompKey = needsCompositeKey(classification);

    // 🎯 HERENCIA: Detectar desde el mapa (como Spring Boot)
    let parentTable: string | undefined;
    let parentClass: string | undefined;
    
    if (inheritanceMap.has(tableName)) {
      parentTable = inheritanceMap.get(tableName);
      parentClass = toPascalCase(parentTable!);
      console.log(`✅ [Flutter Inheritance] ${className} extends ${parentClass}`);
    }

    return {
      tableName,
      className,
      fields,
      primaryKey,
      foreignKeys,
      tableKind,
      needsCompositeKey: needsCompKey,
      parentTable,      // 🎯 Agregar info de herencia al metadata
      parentClass       // 🎯 Agregar info de herencia al metadata
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
 * Genera modelo Dart con HERENCIA REAL usando extends (como Spring Boot)
 */
function generateModel(table: TableMetadata, allTables: TableMetadata[]): string {
  console.log(`\n🏗️ [Flutter Model] ========== GENERATING ${table.className} ==========`);
  
  // 🎯 Si hereda, usar extends (como Spring Boot)
  let parentTableMetadata: TableMetadata | undefined;
  let parentFields: Field[] = [];
  
  if (table.parentTable) {
    parentTableMetadata = allTables.find(t => t.tableName === table.parentTable);
    if (parentTableMetadata) {
      parentFields = parentTableMetadata.fields.filter(f => !f.isMethod);
      console.log(`🔗 [Flutter Model] ${table.className} extends ${table.parentClass}`);
      console.log(`📊 [Flutter Model] Parent fields: ${parentFields.map(f => f.name).join(', ')}`);
    }
  }
  
  // 🎯 Campos propios (sin PK si hereda, ya que se hereda del padre)
  let ownFields = table.fields.filter(f => !f.isMethod);
  
  // Si hereda, excluir PK propio y FK de herencia
  if (table.parentTable) {
    ownFields = ownFields.filter(f => {
      // Excluir PK (se hereda del padre)
      if (f.isPrimary) {
        console.log(`⏭️ [Flutter Model] Skipping PK ${f.name} (inherited from ${table.parentClass})`);
        return false;
      }
      
      // Excluir FK de herencia
      if (f.isForeign || f.name.toLowerCase().endsWith('_id')) {
        const referencedTable = f.references ? 
          f.references.toLowerCase().replace(/\s+/g, '_') :
          f.name.toLowerCase().replace(/_id$/i, '');
        
        if (referencedTable === table.parentTable) {
          console.log(`⏭️ [Flutter Model] Skipping inheritance FK ${f.name} (handled by extends)`);
          return false;
        }
      }
      
      return true;
    });
  }
  
  console.log(`📊 [Flutter Model] Own fields: ${ownFields.map(f => f.name).join(', ')}`);
  
  // Generar definición de campos propios
  const fields = ownFields.map(field => {
    const dartType = mapSqlToDartType(field.type || 'String');
    const isIdField = field.name.toLowerCase() === 'id' && field.isPrimary;
    const isForeignKey = field.isForeign || field.name.toLowerCase().endsWith('_id');
    
    let nullable = '';
    let isNullable = false;
    
    if (isIdField) {
      nullable = '?';
      isNullable = true;
    } else if (isForeignKey) {
      nullable = '?';
      isNullable = true;
    } else if (field.nullable) {
      nullable = '?';
      isNullable = true;
    }
    
    const required = !isNullable && !field.isPrimary ? 'required ' : '';
    
    return {
      name: toCamelCase(field.name),
      type: `${dartType}${nullable}`,
      required: required,
      originalName: field.name,
      isPrimary: field.isPrimary,
      isForeign: isForeignKey,
      isNullable: isNullable
    };
  });
  
  console.log(`📋 [Flutter Model] Final own fields: ${fields.map(f => `${f.name}:${f.type}`).join(', ')}`);
  
  // 🎯 Import de la clase padre si hereda
  let imports = '';
  if (table.parentClass && table.parentTable) {
    imports = `import '${table.parentTable}_model.dart';\n\n`;
    console.log(`📦 [Flutter Model] Adding import: ${table.parentTable}_model.dart`);
  }
  
  // Generar clase
  const extendsClause = table.parentClass ? ` extends ${table.parentClass}` : '';
  const classFields = fields.map(f => `  final ${f.type} ${f.name};`).join('\n');
  
  // Constructor - si hereda, pasar parámetros al padre explícitamente
  let constructorParams = '';
  let superCall = '';
  
  if (table.parentClass && parentFields.length > 0) {
    // Parámetros del padre (declarados pero no como this.field porque van al super)
    const parentParams = parentFields.map(pf => {
      const dartType = mapSqlToDartType(pf.type || 'String');
      const nullable = pf.isPrimary || pf.isForeign || pf.nullable ? '?' : '';
      const fieldName = toCamelCase(pf.name);
      return `${dartType}${nullable} ${fieldName}`;
    }).join(', ');
    
    // Parámetros propios
    const ownParams = fields.map(f => `${f.required}this.${f.name}`).join(', ');
    
    constructorParams = parentParams + (ownParams ? ', ' + ownParams : '');
    
    // Llamada al constructor del padre con PARÁMETROS NOMBRADOS
    const superArgs = parentFields.map(pf => {
      const fieldName = toCamelCase(pf.name);
      return `${fieldName}: ${fieldName}`;
    }).join(', ');
    superCall = ` : super(${superArgs})`;
  } else {
    // Sin herencia
    constructorParams = fields.map(f => `${f.required}this.${f.name}`).join(', ');
  }
  
  // fromJson - parsear TODOS los campos (padre + propios)
  const allFieldsForJson = table.parentClass && parentFields.length > 0 
    ? [...parentFields, ...ownFields]
    : ownFields;
  
  // 🎯 Construir mapa de FKs para usar nombres correctos en JSON
  const fkJsonKeyMap = new Map<string, string>();
  allFieldsForJson.forEach(field => {
    if (field.isForeign && field.references) {
      const refTableName = field.references.toLowerCase().replace(/\s+/g, '_');
      const refTable = allTables.find(t => t.tableName === refTableName);
      if (refTable) {
        const jsonKey = `${toCamelCase(refTable.tableName)}Id`;
        fkJsonKeyMap.set(field.name, jsonKey);
        console.log(`🔧 [Flutter Model] FK ${field.name} → JSON key: "${jsonKey}"`);
      }
    }
  });
  
  const fromJsonFields = allFieldsForJson.map(field => {
    const fieldName = toCamelCase(field.name);
    // 🎯 Para FKs, usar nombre simplificado (pacienteId) no el nombre completo del campo
    const jsonKey = fkJsonKeyMap.get(field.name) || toCamelCase(field.name);
    const baseType = mapSqlToDartType(field.type || 'String');
    const sqlType = (field.type || '').toUpperCase();
    
    if (baseType === 'int') {
      return `      ${fieldName}: json['${jsonKey}'] as int?,`;
    } else if (baseType === 'double') {
      return `      ${fieldName}: (json['${jsonKey}'] as num?)?.toDouble(),`;
    } else if (baseType === 'bool') {
      return `      ${fieldName}: json['${jsonKey}'] as bool?,`;
    } else if (baseType === 'DateTime') {
      // Si es TIME, parsear como "1970-01-01 HH:mm:ss" o usar el string tal cual
      if (sqlType.includes('TIME') && !sqlType.includes('DATETIME') && !sqlType.includes('TIMESTAMP')) {
        return `      ${fieldName}: json['${jsonKey}'] != null ? DateTime.parse('1970-01-01 ' + json['${jsonKey}']) : null,`;
      } else {
        return `      ${fieldName}: json['${jsonKey}'] != null ? DateTime.parse(json['${jsonKey}']) : null,`;
      }
    } else {
      return `      ${fieldName}: json['${jsonKey}'] as String?,`;
    }
  }).join('\n');
  
  // toJson - Si hereda, usar super.toJson() y agregar campos propios
  let toJsonBody = '';
  if (table.parentClass && parentFields.length > 0) {
    // Con herencia: combinar super.toJson() con campos propios
    const ownToJsonFields = ownFields.map(field => {
      const fieldName = toCamelCase(field.name);
      // 🎯 Para FKs, usar nombre simplificado (pacienteId) no el nombre completo del campo
      const jsonKey = fkJsonKeyMap.get(field.name) || toCamelCase(field.name);
      const baseType = mapSqlToDartType(field.type || 'String');
      const sqlType = (field.type || '').toUpperCase();
      
      if (baseType === 'DateTime') {
        // Si es TIME, formatear solo la hora
        if (sqlType.includes('TIME') && !sqlType.includes('DATETIME') && !sqlType.includes('TIMESTAMP')) {
          return `      '${jsonKey}': ${fieldName} != null ? '\${${fieldName}!.hour.toString().padLeft(2, '0')}:\${${fieldName}!.minute.toString().padLeft(2, '0')}:\${${fieldName}!.second.toString().padLeft(2, '0')}' : null,`;
        } else {
          return `      '${jsonKey}': ${fieldName}?.toIso8601String(),`;
        }
      } else {
        return `      '${jsonKey}': ${fieldName},`;
      }
    }).join('\n');
    
    toJsonBody = `    return {
      ...super.toJson(),
${ownToJsonFields}
    };`;
  } else {
    // Sin herencia: incluir todos los campos
    const allToJsonFields = ownFields.map(field => {
      const fieldName = toCamelCase(field.name);
      // 🎯 Para FKs, usar nombre simplificado (pacienteId) no el nombre completo del campo
      const jsonKey = fkJsonKeyMap.get(field.name) || toCamelCase(field.name);
      const baseType = mapSqlToDartType(field.type || 'String');
      const sqlType = (field.type || '').toUpperCase();
      
      if (baseType === 'DateTime') {
        // Si es TIME, formatear solo la hora
        if (sqlType.includes('TIME') && !sqlType.includes('DATETIME') && !sqlType.includes('TIMESTAMP')) {
          return `      '${jsonKey}': ${fieldName} != null ? '\${${fieldName}!.hour.toString().padLeft(2, '0')}:\${${fieldName}!.minute.toString().padLeft(2, '0')}:\${${fieldName}!.second.toString().padLeft(2, '0')}' : null,`;
        } else {
          return `      '${jsonKey}': ${fieldName}?.toIso8601String(),`;
        }
      } else {
        return `      '${jsonKey}': ${fieldName},`;
      }
    }).join('\n');
    
    toJsonBody = `    return {
${allToJsonFields}
    };`;
  }
  
  // copyWith - todos los campos (padre + propios)
  const copyWithParams = allFieldsForJson.map(f => {
    const baseType = mapSqlToDartType(f.type || 'String');
    return `    ${baseType}? ${toCamelCase(f.name)},`;
  }).join('\n');
  
  const copyWithArgs = allFieldsForJson.map(f => {
    const fieldName = toCamelCase(f.name);
    return `      ${fieldName}: ${fieldName} ?? this.${fieldName},`;
  }).join('\n');
  
  // Generar getCompositeKey para tablas que lo necesitan
  let compositeKeyMethod = '';
  if (table.needsCompositeKey && table.foreignKeys.length >= 2) {
    const fkNames = table.foreignKeys.slice(0, 2).map(fk => toCamelCase(fk.name));
    compositeKeyMethod = `\n  String getCompositeKey() => "\${${fkNames[0]}}_\${${fkNames[1]}}";`;
  }
  
  return `${imports}class ${table.className}${extendsClause} {
${classFields}

  ${table.className}({${constructorParams}})${superCall};

  factory ${table.className}.fromJson(Map<String, dynamic> json) {
    return ${table.className}(
${fromJsonFields}
    );
  }

  @override
  Map<String, dynamic> toJson() {
${toJsonBody}
  }

  ${table.className} copyWith({
${copyWithParams}
  }) {
    return ${table.className}(
${copyWithArgs}
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
  static final bool useBackend = false; // Cambiar a true para usar backend real
  static final String baseUrl = "http://10.0.2.2:8080"; // Cambiar a URL del backend Spring Boot en emulador Android

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
        const dartType = mapSqlToDartType(field.type || 'String');
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
function generateProvider(table: TableMetadata, allTables: TableMetadata[]): string {
  // 🎯 Obtener PK correcto (si hereda, usar PK del padre)
  let pkField = toCamelCase(table.primaryKey?.name || 'id');
  
  if (table.parentTable) {
    const parentMeta = allTables.find(t => t.tableName === table.parentTable);
    if (parentMeta && parentMeta.primaryKey) {
      pkField = toCamelCase(parentMeta.primaryKey.name);
      console.log(`🔑 [Provider] ${table.className} uses PK '${pkField}' from parent`);
    }
  }
  
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
  // 🎯 Obtener PK correcto (si hereda, usar PK del padre)
  let pkField = toCamelCase(table.primaryKey?.name || 'id');
  
  if (table.parentTable) {
    const parentMeta = allTables.find(t => t.tableName === table.parentTable);
    if (parentMeta && parentMeta.primaryKey) {
      pkField = toCamelCase(parentMeta.primaryKey.name);
    }
  }
  
  // 🎯 Expandir campos si hereda (igual que en generateModel)
  let allFields = [...table.fields];
  if (table.parentTable) {
    const parentTableMetadata = allTables.find(t => t.tableName === table.parentTable);
    if (parentTableMetadata) {
      const parentFields = parentTableMetadata.fields.filter(f => !f.isPrimary && !f.isMethod);
      allFields = [...parentFields, ...table.fields];
    }
  }
  
  const displayFields = allFields.filter(f => !f.isPrimary && !f.name.toLowerCase().endsWith('_id')).slice(0, 3);
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
 * Genera pantalla de formulario con dropdowns para FKs
 */
function generateFormScreen(table: TableMetadata, allTables: TableMetadata[]): string {
  // 🎯 Obtener PK correcto (si hereda, usar PK del padre)
  let pkField = toCamelCase(table.primaryKey?.name || 'id');
  let pkFieldJson = toCamelCase(table.primaryKey?.name || 'id'); // Para usar en JSON (siempre camelCase)
  
  if (table.parentTable) {
    const parentMeta = allTables.find(t => t.tableName === table.parentTable);
    if (parentMeta && parentMeta.primaryKey) {
      pkField = toCamelCase(parentMeta.primaryKey.name);
      pkFieldJson = toCamelCase(parentMeta.primaryKey.name);
    }
  }
  
  const editableFields = table.fields.filter(f => !f.isPrimary);
  const isJoinTable = table.needsCompositeKey;
  
  // 🎯 Primero detectar tabla padre para excluir su FK
  const parentTableName = table.parentTable;
  
  // Detectar FKs y sus tablas relacionadas (EXCLUYENDO FK a tabla padre)
  const foreignKeyFields = editableFields.filter(f => {
    if (!f.isForeign && !f.name.toLowerCase().endsWith('_id')) {
      return false; // No es FK
    }
    
    // Obtener tabla referenciada
    const referencedTableName = f.references ? 
      f.references.toLowerCase().replace(/\s+/g, '_') : 
      f.name.toLowerCase().replace(/_id$/i, '');
    
    // Excluir si apunta a la tabla padre (es FK de herencia)
    if (parentTableName && referencedTableName === parentTableName) {
      console.log(`🔺 [Flutter Form] Skipping inheritance FK ${f.name} pointing to parent ${parentTableName}`);
      return false;
    }
    
    return true;
  });
  
  const fkTableMap = new Map<string, TableMetadata>();
  
  foreignKeyFields.forEach(fk => {
    const referencedTableName = fk.references ? fk.references.toLowerCase().replace(/\s+/g, '_') : 
                                 fk.name.toLowerCase().replace(/_id$/i, '');
    const referencedTable = allTables.find(t => t.tableName === referencedTableName);
    if (referencedTable) {
      fkTableMap.set(fk.name, referencedTable);
    }
  });
  
  // 🎯 HERENCIA: Detectar usando metadata.parentTable (como Spring Boot)
  // Ya no buscar campo con relationType, usar el parentTable del metadata directamente
  let parentFields: Field[] = [];
  let parentTableMetadata: TableMetadata | undefined;
  
  console.log(`🔍 [Flutter Form] Checking inheritance for ${table.className}:`, {
    hasParent: !!table.parentTable,
    parentTable: table.parentTable,
    parentClass: table.parentClass
  });
  
  if (table.parentTable) {
    parentTableMetadata = allTables.find(t => t.tableName === table.parentTable);
    
    if (parentTableMetadata) {
      console.log(`✅ [Flutter Form] Found parent table: ${parentTableMetadata.className}`);
      // Incluir campos del padre (excepto PK y métodos)
      parentFields = parentTableMetadata.fields.filter(f => !f.isPrimary && !f.isMethod);
      console.log(`📋 [Flutter Form] Parent fields: ${parentFields.map(f => f.name).join(', ')}`);
    } else {
      console.warn(`⚠️ [Flutter Form] Parent table not found for: ${table.parentTable}`);
    }
  } else {
    console.log(`ℹ️ [Flutter Form] No inheritance detected for ${table.className}`);
  }
  
  // Generar controllers para campos NO-FK propios (los campos del padre se agregan después)
  const nonFkFields = editableFields.filter(f => !fkTableMap.has(f.name));
  
  // 🎯 HERENCIA: Agregar controllers para campos del padre
  const allNonFkFields = [...parentFields, ...nonFkFields];
  
  console.log(`📝 [Flutter Form] Form fields for ${table.className}:`, {
    parentFieldsCount: parentFields.length,
    parentFieldNames: parentFields.map(f => f.name),
    ownFieldsCount: nonFkFields.length,
    ownFieldNames: nonFkFields.map(f => f.name),
    totalFields: allNonFkFields.length
  });
  
  const controllers = allNonFkFields.map(f => 
    `  final _${toCamelCase(f.name)}Controller = TextEditingController();`
  ).join('\n');
  
  // Generar variables de selección para FKs (excluyendo campos de herencia que ahora no están en editableFields)
  const fkSelectionVars = foreignKeyFields.map(fk => 
    `  int? _selected${toPascalCase(fk.name)};`
  ).join('\n');

  // Generar initState para campos no-FK (incluyendo campos del padre)
  const nonFkInitState = allNonFkFields.map(f => {
    const fieldName = toCamelCase(f.name);
    const dartType = mapSqlToDartType(f.type || 'String');
    if (dartType === 'String') {
      return `      _${fieldName}Controller.text = widget.item?.${fieldName} ?? '';`;
    } else {
      return `      _${fieldName}Controller.text = widget.item?.${fieldName}?.toString() ?? '';`;
    }
  }).join('\n');
  
  // Generar initState para FKs (inicializar selected) - EXCLUYE INHERITANCE
  const fkInitState = foreignKeyFields.map(fk => {
    const fieldName = toCamelCase(fk.name);
    return `      _selected${toPascalCase(fk.name)} = widget.item?.${fieldName};`;
  }).join('\n');
  
  // Generar carga de datos relacionados
  const fkLoadCalls = Array.from(fkTableMap.values())
    .map(t => `      context.read<${t.className}Provider>().fetchAll();`)
    .join('\n');
  
  const initState = [nonFkInitState, fkInitState].filter(s => s).join('\n');

  const dispose = allNonFkFields.map(f => 
    `    _${toCamelCase(f.name)}Controller.dispose();`
  ).join('\n');

  // 🎯 HERENCIA: Generar función auxiliar para crear campo de texto
  const generateTextField = (field: Field, isParentField: boolean = false) => {
    const fieldName = toCamelCase(field.name);
    const dartType = mapSqlToDartType(field.type || 'String');
    const label = field.name.replace(/_/g, ' ');
    const labelSuffix = isParentField ? ' (heredado)' : '';
    
    if (dartType === 'bool') {
      return `          SwitchListTile(
            title: Text('${label}${labelSuffix}'),
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
              labelText: '${label}${labelSuffix}',
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
              labelText: '${label}${labelSuffix}',
              border: const OutlineInputBorder(),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) return 'Campo requerido';
              return null;
            },
          ),`;
    }
  };
  
  // Generar campos del padre (si hay herencia)
  let parentFieldsSection = '';
  if (parentFields.length > 0 && parentTableMetadata) {
    const parentFieldsCode = parentFields.map(f => generateTextField(f, true)).join('\n          const SizedBox(height: 16),\n');
    parentFieldsSection = `          // 🎯 Campos heredados de ${parentTableMetadata.className}
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              children: [
                Icon(Icons.arrow_upward, color: Colors.blue, size: 20),
                SizedBox(width: 8),
                Text(
                  'Datos de ${parentTableMetadata.className}',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue,
                  ),
                ),
              ],
            ),
          ),
${parentFieldsCode}
          const SizedBox(height: 24),
          Divider(thickness: 2),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              children: [
                Icon(Icons.person, color: Colors.deepPurple, size: 20),
                SizedBox(width: 8),
                Text(
                  'Datos específicos de ${table.className}',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.deepPurple,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
`;
  }
  
  const formFields = editableFields.map(f => {
    const fieldName = toCamelCase(f.name);
    const dartType = mapSqlToDartType(f.type || 'String');
    const label = f.name.replace(/_/g, ' ');
    const isFK = fkTableMap.has(f.name);
    
    // 🎯 FK de herencia ya fueron excluidas en foreignKeyFields, así que no hay que checkear aquí
    
    // Si es FK, generar dropdown
    if (isFK) {
      const relatedTable = fkTableMap.get(f.name)!;
      
      // 🎯 Obtener PK correcto de la tabla relacionada (si hereda, usar PK del padre)
      let relatedPkField = toCamelCase(relatedTable.primaryKey?.name || 'id');
      if (relatedTable.parentTable) {
        const relatedParentMeta = allTables.find(t => t.tableName === relatedTable.parentTable);
        if (relatedParentMeta && relatedParentMeta.primaryKey) {
          relatedPkField = toCamelCase(relatedParentMeta.primaryKey.name);
        }
      }
      
      // 🎯 Buscar displayField: si hereda, incluir campos del padre
      let relatedTableFields = [...relatedTable.fields];
      if (relatedTable.parentTable) {
        const parentMeta = allTables.find(t => t.tableName === relatedTable.parentTable);
        if (parentMeta) {
          const parentFields = parentMeta.fields.filter(f => !f.isPrimary && !f.isMethod);
          relatedTableFields = [...parentFields, ...relatedTable.fields];
        }
      }
      
      const displayField = relatedTableFields.find(rf => !rf.isPrimary && !rf.isForeign && !rf.name.toLowerCase().endsWith('_id'));
      const displayFieldName = displayField ? toCamelCase(displayField.name) : relatedPkField;
      const relationType = f.relationType || '';
      const isRequired = relationType === 'COMPOSITION';
      
      return `          Consumer<${relatedTable.className}Provider>(
            builder: (context, provider, _) {
              if (provider.isLoading) {
                return const Center(child: CircularProgressIndicator());
              }
              
              return DropdownButtonFormField<int>(
                value: _selected${toPascalCase(f.name)},
                decoration: InputDecoration(
                  labelText: '${label}',
                  border: const OutlineInputBorder(),
                  prefixIcon: Icon(Icons.link),
                ),
                hint: const Text('Seleccione una opción'),
                items: provider.items.map((item) {
                  return DropdownMenuItem<int>(
                    value: item.${relatedPkField},
                    child: Text('\${item.${displayFieldName}} (ID: \${item.${relatedPkField}})'),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _selected${toPascalCase(f.name)} = value;
                  });
                },
                validator: ${isRequired ? '(value) {\n                  if (value == null) return \'Campo requerido\';' : '(value) {'}\n                  return null;
                },
              );
            },
          ),`;
    }
    
    // Si no es FK, generar campo normal usando función auxiliar
    return generateTextField(f, false);
  }).filter(s => s).join('\n          const SizedBox(height: 16),\n');
  
  // Combinar campos del padre (si existen) + campos propios
  const allFormFields = parentFieldsSection + formFields;

  // 🎯 HERENCIA: Generar buildData incluyendo campos del padre
  const buildParentData = parentFields.map(f => {
    const fieldName = toCamelCase(f.name);
    const jsonKey = toCamelCase(f.name); // Spring Boot espera camelCase
    const dartType = mapSqlToDartType(f.type || 'String');
    
    if (dartType === 'int') {
      return `        '${jsonKey}': int.parse(_${fieldName}Controller.text),`;
    } else if (dartType === 'double') {
      return `        '${jsonKey}': double.parse(_${fieldName}Controller.text),`;
    } else if (dartType === 'bool') {
      return `        '${jsonKey}': _${fieldName}Controller.text == 'true',`;
    } else {
      return `        '${jsonKey}': _${fieldName}Controller.text,`;
    }
  }).join('\n');

  const buildData = editableFields.map(f => {
    const fieldName = toCamelCase(f.name);
    const dartType = mapSqlToDartType(f.type || 'String');
    const isFK = fkTableMap.has(f.name);
    
    // 🎯 Para FKs: usar nombre de tabla referenciada + "Id" (como Spring Boot DTO)
    let jsonKey = toCamelCase(f.name);
    if (isFK) {
      const refTable = fkTableMap.get(f.name);
      if (refTable) {
        jsonKey = `${toCamelCase(refTable.tableName)}Id`; // e.g., "pacienteId"
        console.log(`🔧 [Flutter Form] FK ${f.name} → JSON key: "${jsonKey}" (table: ${refTable.tableName})`);
      }
    }
    
    // 🎯 FK de herencia ya fueron excluidas en foreignKeyFields
    
    // Si es FK, usar variable de selección
    if (isFK) {
      return `        '${jsonKey}': _selected${toPascalCase(f.name)},`;
    }
    
    // Si no es FK, parsear del controller
    if (dartType === 'int') {
      return `        '${jsonKey}': int.parse(_${fieldName}Controller.text),`;
    } else if (dartType === 'double') {
      return `        '${jsonKey}': double.parse(_${fieldName}Controller.text),`;
    } else if (dartType === 'bool') {
      return `        '${jsonKey}': _${fieldName}Controller.text == 'true',`;
    } else {
      return `        '${jsonKey}': _${fieldName}Controller.text,`;
    }
  }).filter(s => s).join('\n');
  
  // Combinar datos del padre + datos propios
  const allBuildData = [buildParentData, buildData].filter(s => s).join('\n');

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
    updateLogic = `
      if (widget.item != null) {
        // Actualizar - usar el ID guardado
        if (_currentId == null) {
          throw Exception('ID no puede ser nulo al actualizar');
        }
        final updated = ${table.className}.fromJson({
          ...data,
          '${pkFieldJson}': _currentId,
        });
        await provider.update(updated);
      } else {
        // Crear
        await provider.create(${table.className}.fromJson(data));
      }`;
  }

  // Generar imports de providers relacionados
  const relatedProviderImports = Array.from(fkTableMap.values())
    .map(t => `import '../providers/${t.tableName}_provider.dart';`)
    .join('\n');
  const relatedModelImports = Array.from(fkTableMap.values())
    .map(t => `import '../models/${t.tableName}_model.dart';`)
    .join('\n');

  return `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/${table.tableName}_provider.dart';
import '../models/${table.tableName}_model.dart';
${relatedModelImports ? relatedModelImports + '\n' : ''}${relatedProviderImports ? relatedProviderImports + '\n' : ''}
class ${table.className}FormScreen extends StatefulWidget {
  final ${table.className}? item;
  
  const ${table.className}FormScreen({super.key, this.item});

  @override
  State<${table.className}FormScreen> createState() => _${table.className}FormScreenState();
}

class _${table.className}FormScreenState extends State<${table.className}FormScreen> {
  final _formKey = GlobalKey<FormState>();
${controllers}
${fkSelectionVars ? '\n' + fkSelectionVars : ''}
  int? _currentId; // Guardar el ID del item actual

  @override
  void initState() {
    super.initState();
    
    // Cargar datos relacionados
    WidgetsBinding.instance.addPostFrameCallback((_) {
${fkLoadCalls}
    });
    
    if (widget.item != null) {
      _currentId = widget.item!.${pkField}; // Guardar el ID actual
      print('📝 [${table.className} Form] Editing item with ID: \$_currentId');
      if (_currentId == null) {
        print('⚠️ [${table.className} Form] WARNING: Item ID is null! Item: \${widget.item}');
      }
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
${allBuildData}
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
${allFormFields}
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
