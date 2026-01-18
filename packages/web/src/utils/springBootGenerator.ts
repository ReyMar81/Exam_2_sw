import { Node, Edge } from "reactflow";
import type { Field, TableData } from "@shared/types";
import JSZip from "jszip";

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
  foreignKeys: Array<{ field: Field; referencedTable: string }>;
  isJunctionTable: boolean;
  hasAdditionalFields: boolean;
  isPureJoinTable?: boolean; // Nueva: indica si es join pura (solo 2 FKs)
}

/**
 * Genera un puerto aleatorio para evitar conflictos
 */
function getAvailablePort(): number {
  const base = 8080;
  const randomOffset = Math.floor(Math.random() * 1000) + 100;
  return base + randomOffset;
}

/**
 * Genera un proyecto Spring Boot completo desde un diagrama ER
 * @param model - Modelo del diagrama (nodes y edges)
 * @param projectName - Nombre del proyecto (usado para paquetes y ZIP)
 * @returns Buffer del archivo ZIP con el proyecto completo
 */
export async function generateSpringBootProject(
  model: DiagramModel,
  projectName: string
): Promise<Uint8Array> {
  const zip = new JSZip();
  const tableNodes = model.nodes.filter(n => n.type === 'table');
  
  if (tableNodes.length === 0) {
    throw new Error("No hay tablas en el diagrama");
  }

  const sanitizedProjectName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const packageName = `com.${sanitizedProjectName}`;
  const packagePath = `src/main/java/${packageName.replace(/\./g, '/')}`;
  const baseDir = `${sanitizedProjectName}-backend`;
  const port = getAvailablePort();

  // Analizar tablas y relaciones
  const tablesMetadata = analyzeTablesMetadata(tableNodes, model.edges);

  // Generar archivos del proyecto
  zip.file(`${baseDir}/pom.xml`, generatePomXml(sanitizedProjectName));
  zip.file(`${baseDir}/Dockerfile`, generateDockerfile(sanitizedProjectName));
  zip.file(`${baseDir}/docker-compose.yml`, generateDockerCompose(sanitizedProjectName, port));
  zip.file(`${baseDir}/.dockerignore`, generateDockerIgnore());
  zip.file(
    `${baseDir}/src/main/resources/application.properties`,
    generateApplicationProperties(port)
  );
  
  // Generar clase principal con nombre correcto (ProjectNameApplication.java)
  const mainClassName = toPascalCase(sanitizedProjectName) + 'Application';
  zip.file(
    `${baseDir}/${packagePath}/${mainClassName}.java`,
    generateMainClass(packageName, sanitizedProjectName)
  );

  // Generar entidades, repositorios, servicios y controladores
  tablesMetadata.forEach(table => {
    // Si es join pura (solo 2 FKs sin columnas extra), NO generar entidad
    // La relación @ManyToMany se manejará en las entidades principales
    if (table.isPureJoinTable) {
      return; // Skip: no generar archivos para esta tabla
    }

    // Entidades (normales o join extendidas con id)
    zip.file(
      `${baseDir}/${packagePath}/entity/${table.className}.java`,
      generateEntity(table, packageName, tablesMetadata)
    );
    
    // DTOs para entidades con relaciones
    zip.file(
      `${baseDir}/${packagePath}/dto/${table.className}DTO.java`,
      generateDTO(table, packageName, tablesMetadata)
    );

    // Generar CRUD para todas las entidades con id
    zip.file(
      `${baseDir}/${packagePath}/repository/${table.className}Repository.java`,
      generateRepository(table, packageName)
    );

    zip.file(
      `${baseDir}/${packagePath}/service/${table.className}Service.java`,
      generateService(table, packageName, tablesMetadata)
    );

    zip.file(
      `${baseDir}/${packagePath}/controller/${table.className}Controller.java`,
      generateController(table, packageName, tablesMetadata)
    );
  });

  // README con instrucciones y ejemplos JSON
  zip.file(
    `${baseDir}/README.md`,
    generateReadme(sanitizedProjectName, port, tablesMetadata)
  );

  return await zip.generateAsync({ type: "uint8array" });
}

/**
 * Analiza metadata de tablas incluyendo detección de tablas intermedias
 */
function analyzeTablesMetadata(nodes: Node[], edges: Edge[]): TableMetadata[] {
  return nodes.map(node => {
    const data = node.data as TableData;
    const tableName = (data.name || data.label || "tabla").toLowerCase().replace(/\s+/g, '_');
    const className = toPascalCase(tableName);
    const fields = data.fields || [];

    const primaryKey = fields.find(f => f.isPrimary) || null;
    const foreignKeys = fields
      .filter(f => f.isForeign && f.references)
      .map(f => ({
        field: f,
        referencedTable: (f.references as string).toLowerCase().replace(/\s+/g, '_')
      }));

    // Detectar tabla intermedia N:M PURA (solo 2 FKs, sin columnas adicionales)
    const fkCount = foreignKeys.length;
    const nonFkFields = fields.filter(f => !f.isForeign && !f.isPrimary);
    
    // Join pura: exactamente 2 FKs y ninguna otra columna (excepto las FKs mismas)
    const isPureJoinTable = fkCount === 2 && nonFkFields.length === 0;
    
    // Join extendida: 2 FKs pero con columnas adicionales (cantidad, fecha, etc.)
    const hasAdditionalFields = nonFkFields.length > 0;
    
    // Es tabla intermedia si tiene 2 FKs (puede ser pura o extendida)
    const isJunctionTable = fkCount === 2;

    return {
      tableName,
      className,
      fields,
      primaryKey,
      foreignKeys,
      isJunctionTable,
      hasAdditionalFields,
      isPureJoinTable
    };
  });
}

/**
 * Genera pom.xml con dependencias Spring Boot
 */
function generatePomXml(projectName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>
    
    <groupId>com.${projectName}</groupId>
    <artifactId>${projectName}-backend</artifactId>
    <version>1.0.0</version>
    <name>${projectName}</name>
    <description>Backend generado automáticamente desde diagrama ER</description>
    
    <properties>
        <java.version>17</java.version>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>
        
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
`;
}

/**
 * Genera Dockerfile para el proyecto Spring Boot
 */
function generateDockerfile(projectName: string): string {
  return `# Dockerfile generado automáticamente por Exam_2_sw
# Multi-stage build para optimizar tamaño de imagen

# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Copiar archivos de configuración Maven
COPY pom.xml .
COPY src ./src

# Compilar el proyecto (saltando tests para build más rápido)
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Crear usuario no-root por seguridad
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copiar el JAR compilado desde el stage anterior
COPY --from=build /app/target/*.jar app.jar

# Exponer puerto (será configurado por docker-compose)
EXPOSE 8080

# Ejecutar la aplicación
ENTRYPOINT ["java", "-jar", "app.jar"]
`;
}

/**
 * Genera docker-compose.yml para ejecutar el backend
 */
function generateDockerCompose(projectName: string, port: number): string {
  return `# docker-compose.yml generado automáticamente por Exam_2_sw
version: "3.9"

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ${projectName}-backend
    ports:
      - "\${PORT:-${port}}:${port}"
    environment:
      - SPRING_PROFILES_ACTIVE=docker
      - SERVER_PORT=${port}
      - JAVA_OPTS=-Xmx512m -Xms256m
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:${port}/actuator/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

# Para ejecutar:
#   docker compose up --build
#
# Para detener:
#   docker compose down
#
# Acceder a:
#   API: http://localhost:${port}
#   H2 Console: http://localhost:${port}/h2-console
`;
}

/**
 * Genera .dockerignore para optimizar build
 */
function generateDockerIgnore(): string {
  return `# Archivos y directorios que Docker debe ignorar
target/
.mvn/
*.class
*.jar
*.war
*.ear
.git/
.gitignore
README.md
.dockerignore
docker-compose.yml

# IDEs
.idea/
.vscode/
*.iml
*.iws
*.ipr

# Logs
*.log

# Sistema operativo
.DS_Store
Thumbs.db
`;
}

/**
 * Genera application.properties con H2 en memoria
 */
function generateApplicationProperties(port: number): string {
  return `# H2 Database Configuration (In-Memory)
spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=

# JPA Configuration
spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

# H2 Console
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console

# Server Configuration
server.port=${port}
`;
}

/**
 * Genera clase principal Application.java
 */
function generateMainClass(packageName: string, projectName: string): string {
  const className = toPascalCase(projectName) + 'Application';
  return `package ${packageName};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ${className} {
    public static void main(String[] args) {
        SpringApplication.run(${className}.class, args);
    }
}
`;
}

/**
 * Genera DTO para evitar referencias circulares y simplificar JSON
 */
function generateDTO(
  table: TableMetadata,
  packageName: string,
  allTables: TableMetadata[]
): string {
  const imports = new Set<string>(['lombok.Data', 'lombok.NoArgsConstructor', 'lombok.AllArgsConstructor']);
  
  // Detectar imports necesarios por tipos de campos
  const typeImports = getRequiredImports(table.fields);
  typeImports.forEach(imp => imports.add(imp));
  
  let fieldsCode = '';
  
  table.fields.forEach(field => {
    const javaField = toCamelCase(field.name);
    const javaType = mapSqlToJavaType(field.type);
    
    // Primary Key
    if (field.isPrimary) {
      fieldsCode += `    private ${javaType} ${javaField};\n\n`;
      return;
    }
    
    // Foreign Key → Solo ID (no objeto completo)
    if (field.isForeign && field.references) {
      const refTableName = field.references.toLowerCase().replace(/\s+/g, '_');
      const refTable = allTables.find(t => t.tableName === refTableName);
      
      if (refTable && !refTable.isPureJoinTable) {
        const relationType = field.relationType || "1-N";
        const refPK = refTable.primaryKey;
        const refPKType = refPK ? mapSqlToJavaType(refPK.type) : 'Integer';
        
        // HERENCIA: No incluir FK en DTO (se hereda el ID)
        if (relationType === 'INHERITANCE') {
          return;
        }
        
        // Otras relaciones: campo con sufijo "Id"
        fieldsCode += `    private ${refPKType} ${toCamelCase(refTable.tableName)}Id;\n\n`;
        return;
      }
    }
    
    // Columna normal
    if (!field.isForeign) {
      fieldsCode += `    private ${javaType} ${javaField};\n\n`;
    }
  });
  
  const importsCode = Array.from(imports)
    .sort((a, b) => {
      const getOrder = (imp: string) => {
        if (imp.startsWith('java.')) return 0;
        if (imp.startsWith('lombok.')) return 1;
        return 2;
      };
      return getOrder(a) - getOrder(b) || a.localeCompare(b);
    })
    .map(imp => `import ${imp};`)
    .join('\n');
  
  return `package ${packageName}.dto;

${importsCode}

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ${table.className}DTO {
${fieldsCode}}
`;
}

/**
 * Genera entidad JPA con relaciones
 */
function generateEntity(
  table: TableMetadata,
  packageName: string,
  allTables: TableMetadata[]
): string {
  // Imports base para JPA y Lombok
  const imports = new Set<string>([
    'jakarta.persistence.*',
    'lombok.Data',
    'lombok.NoArgsConstructor',
    'lombok.AllArgsConstructor'
  ]);

  // Detectar y agregar imports automáticos según tipos de campos
  const typeImports = getRequiredImports(table.fields);
  typeImports.forEach(imp => imports.add(imp));

  let classAnnotations = '@Entity\n';
  classAnnotations += `@Table(name = "${table.tableName}")\n`;
  classAnnotations += '@Data\n';
  classAnnotations += '@NoArgsConstructor\n';
  classAnnotations += '@AllArgsConstructor';

  let fieldsCode = '';

  // Detectar si esta entidad participa en relaciones ManyToMany puras
  const pureJoinTables = allTables.filter(t => t.isPureJoinTable);
  
  pureJoinTables.forEach(joinTable => {
    const fk1 = joinTable.foreignKeys[0];
    const fk2 = joinTable.foreignKeys[1];
    
    // Si esta tabla es referenciada por la join table
    if (fk1.referencedTable === table.tableName) {
      const targetTable = allTables.find(t => t.tableName === fk2.referencedTable);
      if (targetTable) {
        imports.add('java.util.Set');
        imports.add('java.util.HashSet');
        fieldsCode += `    @ManyToMany\n`;
        fieldsCode += `    @JoinTable(\n`;
        fieldsCode += `        name = "${joinTable.tableName}",\n`;
        fieldsCode += `        joinColumns = @JoinColumn(name = "${fk1.field.name}"),\n`;
        fieldsCode += `        inverseJoinColumns = @JoinColumn(name = "${fk2.field.name}")\n`;
        fieldsCode += `    )\n`;
        fieldsCode += `    private Set<${targetTable.className}> ${toCamelCase(targetTable.tableName)}s = new HashSet<>();\n\n`;
      }
    } else if (fk2.referencedTable === table.tableName) {
      const targetTable = allTables.find(t => t.tableName === fk1.referencedTable);
      if (targetTable) {
        imports.add('java.util.Set');
        imports.add('java.util.HashSet');
        fieldsCode += `    @ManyToMany(mappedBy = "${toCamelCase(table.tableName)}s")\n`;
        fieldsCode += `    private Set<${targetTable.className}> ${toCamelCase(targetTable.tableName)}s = new HashSet<>();\n\n`;
      }
    }
  });

  table.fields.forEach(field => {
    const javaField = toCamelCase(field.name);
    const javaType = mapSqlToJavaType(field.type);

    // Primary Key
    if (field.isPrimary) {
      fieldsCode += '    @Id\n';
      fieldsCode += '    @GeneratedValue(strategy = GenerationType.IDENTITY)\n';
    }

    // Foreign Key (relación para joins extendidas o relaciones normales)
    if (field.isForeign && field.references) {
      const refTableName = field.references.toLowerCase().replace(/\s+/g, '_');
      const refTable = allTables.find(t => t.tableName === refTableName);
      
      if (refTable && !refTable.isPureJoinTable) {
        // 🎯 UML 2.5: Determinar tipo de relación y CASCADE
        const relationType = field.relationType || "1-N";
        
        // 🎯 HERENCIA: El PK del hijo ES el FK al padre (@MapsId + @OneToOne)
        if (relationType === 'INHERITANCE' && field.isPrimary) {
          fieldsCode += `    @MapsId\n`;
          fieldsCode += `    @OneToOne(fetch = FetchType.EAGER, cascade = {CascadeType.PERSIST, CascadeType.MERGE}, optional = false)\n`;
          fieldsCode += `    @JoinColumn(name = "${field.name}", nullable = false)\n`;
          fieldsCode += `    private ${refTable.className} ${toCamelCase(refTable.tableName)};\n\n`;
          return;
        }
        
        // 🎯 Otras relaciones (COMPOSITION, AGGREGATION, ASSOCIATION)
        let cascadeType = '';
        let fetchType = 'FetchType.LAZY'; // DEFAULT: LAZY para mejor performance
        let optional = 'optional = true';
        let jsonIgnore = '';
        
        switch (relationType) {
          case 'COMPOSITION':
            // ◆ Composición: Sin CASCADE en @ManyToOne (se maneja desde @OneToMany inverso)
            cascadeType = '';
            optional = 'optional = false';
            fetchType = 'FetchType.LAZY';
            jsonIgnore = '    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})\n';
            break;
            
          case 'AGGREGATION':
            // ◇ Agregación: Sin CASCADE, opcional
            cascadeType = '';
            optional = 'optional = true';
            fetchType = 'FetchType.LAZY';
            jsonIgnore = '    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})\n';
            break;
            
          default:
            // ASSOCIATION, 1-1, 1-N: Sin CASCADE en @ManyToOne
            cascadeType = '';
            optional = field.nullable ? 'optional = true' : 'optional = false';
            fetchType = 'FetchType.LAZY';
            jsonIgnore = '    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})\n';
        }
        
        fieldsCode += jsonIgnore;
        fieldsCode += `    @ManyToOne(fetch = ${fetchType}${cascadeType}, ${optional})\n`;
        fieldsCode += `    @JoinColumn(name = "${field.name}"`;
        
        // Agregar nullable según campo
        if (field.nullable) {
          fieldsCode += ', nullable = true';
        } else {
          fieldsCode += ', nullable = false';
        }
        
        fieldsCode += ')\n';
        fieldsCode += `    private ${refTable.className} ${toCamelCase(refTable.tableName)};\n\n`;
        return;
      }
    }

    // Columna normal
    if (!field.nullable && !field.isPrimary && !field.isForeign) {
      fieldsCode += `    @Column(nullable = false)\n`;
    }

    if (!field.isForeign) {
      fieldsCode += `    private ${javaType} ${javaField};\n\n`;
    }
  });

  const importsCode = Array.from(imports)
    .sort((a, b) => {
      // Ordenar imports: java.* primero, luego jakarta.*, luego lombok.*
      const getOrder = (imp: string) => {
        if (imp.startsWith('java.')) return 0;
        if (imp.startsWith('jakarta.')) return 1;
        if (imp.startsWith('lombok.')) return 2;
        return 3;
      };
      const orderDiff = getOrder(a) - getOrder(b);
      return orderDiff !== 0 ? orderDiff : a.localeCompare(b);
    })
    .map(imp => `import ${imp};`)
    .join('\n');

  console.log(`✅ [AI JavaGen] Generated entity ${table.className} with ${imports.size} imports`);

  return `package ${packageName}.entity;

${importsCode}

${classAnnotations}
public class ${table.className} {
${fieldsCode}}
`;
}

/**
 * Genera repositorio JPA
 */
function generateRepository(table: TableMetadata, packageName: string): string {
  const idType = table.primaryKey ? mapSqlToJavaType(table.primaryKey.type) : 'Integer';
  
  return `package ${packageName}.repository;

import ${packageName}.entity.${table.className};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ${table.className}Repository extends JpaRepository<${table.className}, ${idType}> {
}
`;
}

/**
 * Genera servicio con lógica CRUD y soporte para DTOs
 */
function generateService(table: TableMetadata, packageName: string, allTables: TableMetadata[]): string {
  const idType = table.primaryKey ? mapSqlToJavaType(table.primaryKey.type) : 'Integer';
  const entityVar = toCamelCase(table.className);
  const idFieldName = table.primaryKey?.name || 'id';
  
  // Detectar relaciones FK para construir saveFromDTO
  const fkRelations = table.fields.filter(f => f.isForeign && f.references);
  
  let repositoryAutowires = '';
  let repositoryImports = '';
  let entityImports = '';
  let dtoConversionCode = '';
  
  // Generar autowired e imports para repositorios relacionados
  fkRelations.forEach(fk => {
    const refTableName = fk.references!.toLowerCase().replace(/\s+/g, '_');
    const refTable = allTables.find(t => t.tableName === refTableName);
    if (refTable && !refTable.isPureJoinTable && fk.relationType !== 'INHERITANCE') {
      repositoryAutowires += `    @Autowired\n    private ${refTable.className}Repository ${toCamelCase(refTable.tableName)}Repository;\n    \n`;
      repositoryImports += `import ${packageName}.repository.${refTable.className}Repository;\n`;
      entityImports += `import ${packageName}.entity.${refTable.className};\n`;
    }
  });
  
  // Generar código de conversión DTO → Entity
  if (fkRelations.length > 0) {
    dtoConversionCode = `\n    public ${table.className} saveFromDTO(${table.className}DTO dto) {\n`;
    dtoConversionCode += `        ${table.className} ${entityVar} = new ${table.className}();\n`;
    
    table.fields.forEach(field => {
      const javaField = toCamelCase(field.name);
      
      if (field.isPrimary) {
        return; // Skip PK (auto-generado)
      }
      
      if (field.isForeign && field.references) {
        const refTableName = field.references.toLowerCase().replace(/\s+/g, '_');
        const refTable = allTables.find(t => t.tableName === refTableName);
        
        if (refTable && !refTable.isPureJoinTable && field.relationType !== 'INHERITANCE') {
          const refEntityVar = toCamelCase(refTable.tableName);
          const isOptional = field.nullable || field.relationType === 'AGGREGATION';
          
          if (isOptional) {
            dtoConversionCode += `        if (dto.get${capitalize(refEntityVar)}Id() != null) {\n`;
            dtoConversionCode += `            ${refTable.className} ${refEntityVar} = ${refEntityVar}Repository.findById(dto.get${capitalize(refEntityVar)}Id())\n`;
            dtoConversionCode += `                .orElseThrow(() -> new RuntimeException("${refTable.className} not found"));\n`;
            dtoConversionCode += `            ${entityVar}.set${capitalize(refEntityVar)}(${refEntityVar});\n`;
            dtoConversionCode += `        }\n`;
          } else {
            dtoConversionCode += `        ${refTable.className} ${refEntityVar} = ${refEntityVar}Repository.findById(dto.get${capitalize(refEntityVar)}Id())\n`;
            dtoConversionCode += `            .orElseThrow(() -> new RuntimeException("${refTable.className} not found"));\n`;
            dtoConversionCode += `        ${entityVar}.set${capitalize(refEntityVar)}(${refEntityVar});\n`;
          }
        }
      } else if (!field.isForeign) {
        dtoConversionCode += `        ${entityVar}.set${capitalize(javaField)}(dto.get${capitalize(javaField)}());\n`;
      }
    });
    
    dtoConversionCode += `        return repository.save(${entityVar});\n`;
    dtoConversionCode += `    }\n`;
    
    // Método updateFromDTO
    dtoConversionCode += `\n    public ${table.className} updateFromDTO(${idType} id, ${table.className}DTO dto) {\n`;
    dtoConversionCode += `        ${table.className} ${entityVar} = repository.findById(id)\n`;
    dtoConversionCode += `            .orElseThrow(() -> new RuntimeException("${table.className} con id " + id + " no encontrado"));\n`;
    
    table.fields.forEach(field => {
      const javaField = toCamelCase(field.name);
      
      if (field.isPrimary) {
        return;
      }
      
      if (field.isForeign && field.references) {
        const refTableName = field.references.toLowerCase().replace(/\s+/g, '_');
        const refTable = allTables.find(t => t.tableName === refTableName);
        
        if (refTable && !refTable.isPureJoinTable && field.relationType !== 'INHERITANCE') {
          const refEntityVar = toCamelCase(refTable.tableName);
          const isOptional = field.nullable || field.relationType === 'AGGREGATION';
          
          if (isOptional) {
            dtoConversionCode += `        if (dto.get${capitalize(refEntityVar)}Id() != null) {\n`;
            dtoConversionCode += `            ${refTable.className} ${refEntityVar} = ${refEntityVar}Repository.findById(dto.get${capitalize(refEntityVar)}Id())\n`;
            dtoConversionCode += `                .orElseThrow(() -> new RuntimeException("${refTable.className} not found"));\n`;
            dtoConversionCode += `            ${entityVar}.set${capitalize(refEntityVar)}(${refEntityVar});\n`;
            dtoConversionCode += `        }\n`;
          } else {
            dtoConversionCode += `        ${refTable.className} ${refEntityVar} = ${refEntityVar}Repository.findById(dto.get${capitalize(refEntityVar)}Id())\n`;
            dtoConversionCode += `            .orElseThrow(() -> new RuntimeException("${refTable.className} not found"));\n`;
            dtoConversionCode += `        ${entityVar}.set${capitalize(refEntityVar)}(${refEntityVar});\n`;
          }
        }
      } else if (!field.isForeign) {
        dtoConversionCode += `        ${entityVar}.set${capitalize(javaField)}(dto.get${capitalize(javaField)}());\n`;
      }
    });
    
    dtoConversionCode += `        return repository.save(${entityVar});\n`;
    dtoConversionCode += `    }\n`;
  }
  
  return `package ${packageName}.service;

import ${packageName}.entity.${table.className};
import ${packageName}.dto.${table.className}DTO;
import ${packageName}.repository.${table.className}Repository;
${entityImports}${repositoryImports}import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ${table.className}Service {
    
    @Autowired
    private ${table.className}Repository repository;
    ${repositoryAutowires}
    public List<${table.className}> findAll() {
        return repository.findAll();
    }
    
    public Optional<${table.className}> findById(${idType} id) {
        return repository.findById(id);
    }
    
    public ${table.className} save(${table.className} ${entityVar}) {
        return repository.save(${entityVar});
    }
    ${dtoConversionCode}
    public ${table.className} update(${idType} id, ${table.className} ${entityVar}) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("${table.className} con id " + id + " no encontrado");
        }
        ${entityVar}.set${capitalize(toCamelCase(idFieldName))}(id);
        return repository.save(${entityVar});
    }
    
    public void delete(${idType} id) {
        repository.deleteById(id);
    }
}
`;
}

/**
 * Genera controlador REST con soporte para DTOs
 */
function generateController(table: TableMetadata, packageName: string, allTables: TableMetadata[]): string {
  const idType = table.primaryKey ? mapSqlToJavaType(table.primaryKey.type) : 'Integer';
  const entityVar = toCamelCase(table.className);
  const pluralName = table.tableName; // Usar nombre de tabla como plural en minúsculas
  
  // Detectar si tiene relaciones FK para usar DTO
  const hasFKRelations = table.fields.some(f => f.isForeign && f.references && f.relationType !== 'INHERITANCE');
  
  const dtoMethods = hasFKRelations ? `
    @PostMapping
    public ${table.className} create(@RequestBody ${table.className}DTO dto) {
        return service.saveFromDTO(dto);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<${table.className}> update(
        @PathVariable ${idType} id,
        @RequestBody ${table.className}DTO dto
    ) {
        try {
            return ResponseEntity.ok(service.updateFromDTO(id, dto));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
` : `
    @PostMapping
    public ${table.className} create(@RequestBody ${table.className} ${entityVar}) {
        return service.save(${entityVar});
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<${table.className}> update(
        @PathVariable ${idType} id,
        @RequestBody ${table.className} ${entityVar}
    ) {
        try {
            return ResponseEntity.ok(service.update(id, ${entityVar}));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
`;

  const dtoImport = hasFKRelations ? `import ${packageName}.dto.${table.className}DTO;\n` : '';
  
  return `package ${packageName}.controller;

import ${packageName}.entity.${table.className};
${dtoImport}import ${packageName}.service.${table.className}Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/${pluralName}")
@CrossOrigin(origins = "*")
public class ${table.className}Controller {
    
    @Autowired
    private ${table.className}Service service;
    
    @GetMapping
    public List<${table.className}> getAll() {
        return service.findAll();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<${table.className}> getById(@PathVariable ${idType} id) {
        return service.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    ${dtoMethods}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable ${idType} id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
`;
}

/**
 * Genera ejemplos JSON para cada entidad usando DTOs
 */
function generateJsonExamples(tablesMetadata: TableMetadata[]): string {
  let examples = '';
  
  tablesMetadata.forEach(table => {
    if (table.isPureJoinTable) return; // Skip join tables puras
    
    const hasFKRelations = table.fields.some(f => f.isForeign && f.references && f.relationType !== 'INHERITANCE');
    
    examples += `### ${table.tableName} (${table.className})\n\n`;
    examples += `**Endpoint:** \`http://localhost:{PORT}/${table.tableName}\`\n\n`;
    
    if (hasFKRelations) {
      examples += `**POST/PUT JSON (usando DTO con IDs):**\n\n`;
    } else {
      examples += `**POST/PUT JSON:**\n\n`;
    }
    
    examples += '```json\n';
    examples += '{\n';
    
    const exampleFields: string[] = [];
    
    table.fields.forEach(field => {
      // Skip PK (auto-generado) y FKs de herencia (@MapsId)
      if (field.isPrimary) return;
      if (field.isForeign && field.relationType === 'INHERITANCE') return;
      
      const javaField = toCamelCase(field.name);
      const javaType = mapSqlToJavaType(field.type);
      
      // Generar valor de ejemplo según tipo
      let exampleValue: string;
      
      if (field.isForeign && field.references) {
        // FK: Solo el ID (DTO pattern)
        const refTable = field.references.toString().toLowerCase().replace(/\s+/g, '_');
        const refClassName = toPascalCase(refTable);
        exampleValue = `1 // ID de ${refClassName} (${refTable})`;
        const fieldName = `${toCamelCase(refTable)}Id`;
        exampleFields.push(`  "${fieldName}": ${exampleValue}`);
        return;
      }
      
      switch (javaType) {
        case 'Integer':
        case 'Long':
        case 'Short':
          exampleValue = '123';
          break;
        case 'Double':
        case 'Float':
          exampleValue = '123.45';
          break;
        case 'BigDecimal':
          exampleValue = '"999.99"';
          break;
        case 'Boolean':
          exampleValue = 'true';
          break;
        case 'LocalDate':
          exampleValue = '"2026-01-18"';
          break;
        case 'LocalDateTime':
          exampleValue = '"2026-01-18T12:00:00"';
          break;
        case 'LocalTime':
          exampleValue = '"12:00:00"';
          break;
        default:
          exampleValue = `"texto_ejemplo"`;
      }
      
      exampleFields.push(`  "${javaField}": ${exampleValue}`);
    });
    
    examples += exampleFields.join(',\n');
    examples += '\n}\n';
    examples += '```\n\n';
  });
  
  return examples;
}

/**
 * Genera README con instrucciones de ejecución
 */
function generateReadme(projectName: string, port: number, tablesMetadata: TableMetadata[]): string {
  return `# ${projectName} Backend

Backend Spring Boot generado automáticamente desde diagrama ER por **Exam_2_sw**.

## 🚀 Ejecución con Docker (Recomendado)

### Opción 1: Docker Compose (más simple)

\`\`\`bash
docker-compose up --build
\`\`\`

El servidor arrancará automáticamente. Verás en los logs:

\`\`\`
Started Application in X.XXX seconds
\`\`\`

### Opción 2: Docker manual

\`\`\`bash
# Construir imagen
docker build -t ${projectName}-backend .

# Ejecutar contenedor
docker run -p ${port}:${port} ${projectName}-backend
\`\`\`

### Detener el contenedor

\`\`\`bash
docker compose down
\`\`\`

---

## 📦 Ejecución sin Docker

### Requisitos
- Java 17+
- Maven 3.6+

### Comandos

\`\`\`bash
# Compilar y ejecutar
mvn spring-boot:run

# O compilar y ejecutar JAR
mvn clean package
java -jar target/*.jar
\`\`\`

---

## 🗃️ Base de datos H2

Console disponible en: **http://localhost:${port}/h2-console**

Credenciales:
- **JDBC URL:** \`jdbc:h2:mem:testdb\`
- **User:** \`sa\`
- **Password:** *(vacío)*

La base de datos se crea automáticamente en memoria con todas las tablas del diagrama.

---

## 🔄 Mapeo de Tipos SQL → Java

El generador convierte automáticamente los tipos SQL a tipos Java apropiados:

| Tipo SQL | Tipo Java | Import Automático |
|----------|-----------|-------------------|
| \`INT\`, \`SERIAL\` | \`Integer\` | — |
| \`BIGINT\`, \`BIGSERIAL\` | \`Long\` | — |
| \`SMALLINT\` | \`Short\` | — |
| \`VARCHAR\`, \`TEXT\` | \`String\` | — |
| \`BOOLEAN\` | \`Boolean\` | — |
| \`DECIMAL\`, \`NUMERIC\` | \`BigDecimal\` | \`java.math.BigDecimal\` |
| \`FLOAT\`, \`REAL\` | \`Float\` | — |
| \`DOUBLE\` | \`Double\` | — |
| \`DATE\` | \`LocalDate\` | \`java.time.LocalDate\` |
| \`DATETIME\`, \`TIMESTAMP\` | \`LocalDateTime\` | \`java.time.LocalDateTime\` |
| \`TIME\` | \`LocalTime\` | \`java.time.LocalTime\` |
| \`UUID\` | \`UUID\` | \`java.util.UUID\` |
| \`BLOB\`, \`BYTEA\` | \`byte[]\` | — |

> **Nota:** Los imports se agregan automáticamente según los tipos detectados en cada entidad.

---

## 🌐 Endpoints REST

Cada entidad generada tiene endpoints CRUD completos:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| \`GET\` | \`/{entidad}\` | Listar todos los registros |
| \`GET\` | \`/{entidad}/{id}\` | Obtener un registro por ID |
| \`POST\` | \`/{entidad}\` | Crear nuevo registro |
| \`PUT\` | \`/{entidad}/{id}\` | Actualizar registro existente |
| \`DELETE\` | \`/{entidad}/{id}\` | Eliminar registro |

### Ejemplo con cURL

\`\`\`bash
# Listar todas las entidades de una tabla
curl http://localhost:${port}/nombre_tabla

# Crear nuevo registro
curl -X POST http://localhost:${port}/nombre_tabla \\
  -H "Content-Type: application/json" \\
  -d '{"campo1": "valor1", "campo2": "valor2"}'

# Obtener por ID
curl http://localhost:${port}/nombre_tabla/1

# Actualizar
curl -X PUT http://localhost:${port}/nombre_tabla/1 \\
  -H "Content-Type: application/json" \\
  -d '{"campo1": "nuevo_valor"}'

# Eliminar
curl -X DELETE http://localhost:${port}/nombre_tabla/1
\`\`\`

---

## 📁 Estructura del proyecto

\`\`\`
src/main/java/com/${projectName}/
├── ${toPascalCase(projectName)}Application.java  # Clase principal Spring Boot
├── entity/                   # Entidades JPA generadas
│   ├── Entity1.java
│   └── Entity2.java
├── repository/               # Repositorios JPA
│   ├── Entity1Repository.java
│   └── Entity2Repository.java
├── service/                  # Lógica de negocio
│   ├── Entity1Service.java
│   └── Entity2Service.java
└── controller/               # Controladores REST
    ├── Entity1Controller.java
    └── Entity2Controller.java
\`\`\`

---

## 🧪 Probar con Postman

1. Importa la colección usando los endpoints documentados arriba
2. Configura la base URL: \`http://localhost:${port}\`
3. Usa \`Content-Type: application/json\` en los headers
4. Los datos persisten solo durante la ejecución (H2 en memoria)

### 📝 Ejemplos JSON por Entidad

${generateJsonExamples(tablesMetadata)}

---

## ⚙️ Configuración

Edita \`src/main/resources/application.properties\` para cambiar:

- Puerto del servidor: \`server.port\`
- URL de base de datos: \`spring.datasource.url\`
- Estrategia JPA: \`spring.jpa.hibernate.ddl-auto\`

---

## 🐳 Notas sobre Docker

- La imagen usa **multi-stage build** para reducir tamaño
- Base: \`eclipse-temurin:17-jre-alpine\` (solo runtime, no JDK completo)
- Usuario no-root por seguridad
- Healthcheck incluido para verificar disponibilidad
- Puerto configurable mediante variable \`PORT\`

---

## 📝 Generado por

**Exam_2_sw** - Sistema de diagramas ER colaborativo  
Exportación automática: Spring Boot 3.2 + Maven + Docker  
Framework: Jakarta EE 9+ (Spring Boot 3.x)
`;
}

/**
 * Mapea tipos SQL a tipos Java con precisión mejorada
 */
function mapSqlToJavaType(sqlType: string): string {
  const type = sqlType.toUpperCase();
  
  // Tipos numéricos enteros
  if (type.includes('BIGINT') || type.includes('BIGSERIAL')) return 'Long';
  if (type.includes('INT') || type.includes('SERIAL')) return 'Integer';
  if (type.includes('SMALLINT')) return 'Short';
  if (type.includes('TINYINT')) return 'Byte';
  
  // Tipos de texto
  if (type.includes('VARCHAR') || type.includes('TEXT') || type.includes('CHAR')) return 'String';
  
  // Tipos booleanos
  if (type.includes('BOOLEAN') || type.includes('BOOL')) return 'Boolean';
  
  // Tipos decimales (usar BigDecimal para precisión)
  if (type.includes('DECIMAL') || type.includes('NUMERIC') || type.includes('MONEY')) return 'BigDecimal';
  
  // Tipos de punto flotante
  if (type.includes('DOUBLE')) return 'Double';
  if (type.includes('FLOAT') || type.includes('REAL')) return 'Float';
  
  // Tipos de fecha y hora
  if (type.includes('TIMESTAMP') || type.includes('DATETIME')) return 'LocalDateTime';
  if (type.includes('DATE') && !type.includes('TIME')) return 'LocalDate';
  if (type.includes('TIME') && !type.includes('STAMP')) return 'LocalTime';
  
  // Tipos binarios
  if (type.includes('BLOB') || type.includes('BYTEA') || type.includes('BINARY')) return 'byte[]';
  
  // UUID
  if (type.includes('UUID')) return 'UUID';
  
  // JSON (como String por defecto)
  if (type.includes('JSON')) return 'String';
  
  return 'String'; // Default para tipos desconocidos
}

/**
 * Determina qué imports Java son necesarios según los tipos de campos
 */
function getRequiredImports(fields: Field[]): Set<string> {
  const imports = new Set<string>();
  
  fields.forEach(field => {
    const javaType = mapSqlToJavaType(field.type);
    
    // Imports según el tipo Java
    switch (javaType) {
      case 'LocalDate':
        imports.add('java.time.LocalDate');
        console.log(`🔧 [AI JavaGen] Added import java.time.LocalDate for field '${field.name}' (${field.type})`);
        break;
      case 'LocalDateTime':
        imports.add('java.time.LocalDateTime');
        console.log(`🔧 [AI JavaGen] Added import java.time.LocalDateTime for field '${field.name}' (${field.type})`);
        break;
      case 'LocalTime':
        imports.add('java.time.LocalTime');
        console.log(`🔧 [AI JavaGen] Added import java.time.LocalTime for field '${field.name}' (${field.type})`);
        break;
      case 'BigDecimal':
        imports.add('java.math.BigDecimal');
        console.log(`🔧 [AI JavaGen] Added import java.math.BigDecimal for field '${field.name}' (${field.type})`);
        break;
      case 'UUID':
        imports.add('java.util.UUID');
        console.log(`🔧 [AI JavaGen] Added import java.util.UUID for field '${field.name}' (${field.type})`);
        break;
    }
  });
  
  return imports;
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
 * Capitaliza la primera letra de un string (para getters/setters)
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Descarga el ZIP del proyecto Spring Boot
 */
export function downloadSpringBootProject(zipBuffer: Uint8Array, projectName: string): void {
  const blob = new Blob([zipBuffer as any], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${projectName}-backend.zip`;
  link.click();
  URL.revokeObjectURL(url);
}
