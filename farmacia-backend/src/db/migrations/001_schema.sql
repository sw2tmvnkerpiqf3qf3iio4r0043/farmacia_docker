-- ============================================================================
-- SCRIPT  - MAIN FARMA
-- GESTIÓN DE DATOS Y PERSISTENCIA - FASE 1
-- CATÁLOGO AMPLIADO: MEDICAMENTOS + PARAFARMACIA + SALUD + BEBÉ
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CATEGORÍA DE MEDICAMENTOS / PRODUCTOS
-- ============================================================================
CREATE TABLE categoria_medicamento (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    tipo_categoria VARCHAR(30) NOT NULL DEFAULT 'medicamento'
        CHECK (tipo_categoria IN (
            'medicamento',
            'parafarmacia',
            'dermocosmetica',
            'higiene',
            'salud',
            'nutricion',
            'bebe',
            'general'
        )),
    tipo_enfermedad VARCHAR(30) NOT NULL
        CHECK (tipo_enfermedad IN (
            'cronica',
            'estacional',
            'aguda',
            'bienestar',
            'prevencion',
            'cuidado_personal',
            'infantil',
            'nutricion',
            'general',
            'no_aplica'
        )),
    estacion_relevante VARCHAR(20) NOT NULL DEFAULT 'todo_el_anio'
        CHECK (estacion_relevante IN (
            'invierno',
            'verano',
            'otono',
            'primavera',
            'todo_el_anio'
        )),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_categoria_padre INTEGER
        REFERENCES categoria_medicamento(id_categoria)
        ON DELETE SET NULL,
    CHECK (id_categoria_padre IS NULL OR id_categoria_padre <> id_categoria)
);
CREATE INDEX idx_categoria_padre
ON categoria_medicamento(id_categoria_padre);
CREATE INDEX idx_categoria_tipo
ON categoria_medicamento(tipo_categoria);

INSERT INTO categoria_medicamento
(
    id_categoria,
    nombre,
    descripcion,
    tipo_categoria,
    tipo_enfermedad,
    estacion_relevante,
    id_categoria_padre
)
VALUES
(1,'Analgésicos y antiinflamatorios','Medicamentos para dolor, fiebre e inflamación.','medicamento','aguda','todo_el_anio',NULL),
(2,'Antibióticos y antimicrobianos','Medicamentos para infecciones bacterianas.','medicamento','aguda','todo_el_anio',NULL),
(3,'Antifúngicos','Medicamentos para infecciones por hongos.','medicamento','cronica','todo_el_anio',NULL),
(4,'Antigripales y respiratorios','Medicamentos para gripe, tos y vías respiratorias.','medicamento','estacional','invierno',NULL),
(5,'Cardiovascular y presión','Medicamentos para corazón, presión arterial y colesterol.','medicamento','cronica','todo_el_anio',NULL),
(6,'Gastrointestinales','Medicamentos para digestión, acidez y estómago.','medicamento','aguda','todo_el_anio',NULL),
(7,'Vitaminas y suplementos','Vitaminas, minerales y suplementos alimenticios.','nutricion','bienestar','todo_el_anio',NULL),
(8,'Corticoides y antiinflamatorios hormonales','Corticoides y antiinflamatorios hormonales.','medicamento','aguda','todo_el_anio',NULL),
(9,'Higiene corporal y capilar','Geles de baño, jabones y champús.','higiene','cuidado_personal','todo_el_anio',NULL),
(10,'Higiene bucodental','Pastas dentales, enjuagues e higiene bucal.','higiene','cuidado_personal','todo_el_anio',NULL),
(11,'Dermocosmética y belleza','Cuidado facial, corporal y belleza.','dermocosmetica','cuidado_personal','todo_el_anio',NULL),
(12,'Protección solar','Protectores solares para piel y labios.','dermocosmetica','prevencion','verano',NULL),
(13,'Salud y primeros auxilios','Material de curación, antisépticos y diagnóstico.','salud','prevencion','todo_el_anio',NULL),
(14,'Bebés y puericultura','Pañales, alimentación y cuidado del bebé.','bebe','infantil','todo_el_anio',NULL),

(15,'Analgésicos en tabletas','Presentaciones orales sólidas para dolor y fiebre.','medicamento','aguda','todo_el_anio',1),
(16,'Analgésicos tópicos','Geles y cremas para dolor muscular o articular.','medicamento','aguda','todo_el_anio',1),
(17,'Antibióticos orales','Antibióticos en cápsulas o tabletas.','medicamento','aguda','todo_el_anio',2),
(18,'Cremas antifúngicas','Tratamientos tópicos contra micosis.','medicamento','cronica','todo_el_anio',3),
(19,'Antifúngicos orales','Tratamientos orales contra infecciones fúngicas.','medicamento','cronica','todo_el_anio',3),
(20,'Jarabes y soluciones respiratorias','Jarabes para tos, gripe y vías respiratorias.','medicamento','estacional','invierno',4),
(21,'Antihipertensivos y estatinas','Tratamiento cardiovascular oral.','medicamento','cronica','todo_el_anio',5),
(22,'Antiulcerosos y digestivos','Medicamentos para acidez y digestión.','medicamento','aguda','todo_el_anio',6),
(23,'Vitaminas y minerales','Suplementos vitamínicos y minerales.','nutricion','bienestar','todo_el_anio',7),
(24,'Cremas y cuidado facial','Dermocosmética facial.','dermocosmetica','cuidado_personal','todo_el_anio',11),
(25,'Protectores solares faciales y corporales','Protectores solares de amplio espectro.','dermocosmetica','prevencion','verano',12),
(26,'Champús y geles de baño','Higiene corporal y capilar.','higiene','cuidado_personal','todo_el_anio',9),
(27,'Pasta dental y enjuagues','Higiene bucodental.','higiene','cuidado_personal','todo_el_anio',10),
(28,'Material de curación','Gasas, vendas, antisépticos y primeros auxilios.','salud','prevencion','todo_el_anio',13),
(29,'Pañales y cuidado del bebé','Higiene infantil.','bebe','infantil','todo_el_anio',14),
(30,'Alimentación infantil','Leches de fórmula y papillas.','bebe','infantil','todo_el_anio',14);

-- ============================================================================
-- 2. PRINCIPIO ACTIVO
-- ============================================================================
CREATE TABLE principio_activo (
    id_principio_activo SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    descripcion TEXT,
    requiere_control_especial BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_principio_activo_nombre
ON principio_activo(nombre);

INSERT INTO principio_activo
(
    id_principio_activo,
    nombre,
    descripcion,
    requiere_control_especial,
    activo
)
VALUES
(1,'Clotrimazol','Antifúngico de uso tópico.',FALSE,TRUE),
(2,'Paracetamol','Analgésico y antipirético.',FALSE,TRUE),
(3,'Amoxicilina','Antibiótico betalactámico.',TRUE,TRUE),
(4,'Omeprazol','Inhibidor de la secreción ácida gástrica.',FALSE,TRUE),
(5,'Ibuprofeno','Antiinflamatorio no esteroideo.',FALSE,TRUE),
(6,'Diclofenaco','Antiinflamatorio no esteroideo.',FALSE,TRUE),
(7,'Ketorolaco','Analgésico antiinflamatorio.',TRUE,TRUE),
(8,'Naproxeno','Antiinflamatorio no esteroideo.',FALSE,TRUE),
(9,'Azitromicina','Antibiótico macrólido.',TRUE,TRUE),
(10,'Ciprofloxacino','Antibiótico fluoroquinolona.',TRUE,TRUE),
(11,'Loratadina','Antihistamínico.',FALSE,TRUE),
(12,'Ambroxol','Mucolítico.',FALSE,TRUE),
(13,'Salbutamol','Broncodilatador.',TRUE,TRUE),
(14,'Enalapril','Inhibidor de la ECA.',FALSE,TRUE),
(15,'Losartán','Antagonista de angiotensina II.',FALSE,TRUE),
(16,'Atorvastatina','Estatina para colesterol.',FALSE,TRUE),
(17,'Dexametasona','Corticoide.',TRUE,TRUE),
(18,'Hidrocortisona','Corticoide tópico.',FALSE,TRUE),
(19,'Complejo B','Suplemento vitamínico.',FALSE,TRUE),
(20,'Vitamina C','Suplemento antioxidante.',FALSE,TRUE);

-- ============================================================================
-- 3. MEDICAMENTO / PRODUCTO
-- ============================================================================
CREATE TABLE medicamento (
    id_medicamento SERIAL PRIMARY KEY,
    codigo_barras VARCHAR(50) UNIQUE NOT NULL,
    nombre_comercial VARCHAR(200) NOT NULL,
    nombre_generico VARCHAR(200) NOT NULL,
    descripcion TEXT,
    id_categoria INTEGER NOT NULL
        REFERENCES categoria_medicamento(id_categoria)
        ON DELETE RESTRICT,
    tipo_producto VARCHAR(30) NOT NULL DEFAULT 'medicamento'
        CHECK (tipo_producto IN (
            'medicamento',
            'parafarmacia',
            'dermocosmetica',
            'cuidado_personal',
            'higiene',
            'nutricion',
            'primeros_auxilios',
            'salud',
            'bebe',
            'otro'
        )),
    presentacion VARCHAR(30) NOT NULL
        CHECK (presentacion IN (
            'tableta',
            'capsula',
            'jarabe',
            'crema',
            'gel',
            'gotas',
            'inyeccion',
            'polvo',
            'spray',
            'aerosol',
            'shampoo',
            'jabon',
            'pasta_dental',
            'enjuague',
            'protector_solar',
            'toallita',
            'panial',
            'biberon',
            'chupete',
            'frasco',
            'tubo',
            'caja',
            'sachet',
            'sobre',
            'unidad',
            'paquete',
            'otro'
        )),
    concentracion VARCHAR(50) NOT NULL DEFAULT 'N/A',
    unidad_venta VARCHAR(20) NOT NULL DEFAULT 'unidad'
        CHECK (unidad_venta IN (
            'unidad',
            'caja',
            'frasco',
            'tubo',
            'paquete'
        )),
    precio_compra DECIMAL(10,2) NOT NULL CHECK (precio_compra >= 0),
    precio_venta DECIMAL(10,2) NOT NULL CHECK (precio_venta >= 0),
    requiere_receta BOOLEAN NOT NULL DEFAULT FALSE,
    requiere_control_lote BOOLEAN NOT NULL DEFAULT TRUE,
    es_generico BOOLEAN NOT NULL DEFAULT FALSE,
    medicamento_equivalente INTEGER
        REFERENCES medicamento(id_medicamento)
        ON DELETE SET NULL,
    imagen_url TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK (medicamento_equivalente IS NULL OR medicamento_equivalente <> id_medicamento)
);
CREATE INDEX idx_medicamento_categoria
ON medicamento(id_categoria);

CREATE INDEX idx_medicamento_tipo
ON medicamento(tipo_producto);

CREATE INDEX idx_medicamento_codigo_barras
ON medicamento(codigo_barras);

CREATE INDEX idx_medicamento_equivalente
ON medicamento(medicamento_equivalente);

INSERT INTO medicamento
(
    id_medicamento,
    codigo_barras,
    nombre_comercial,
    nombre_generico,
    descripcion,
    id_categoria,
    tipo_producto,
    presentacion,
    concentracion,
    unidad_venta,
    precio_compra,
    precio_venta,
    requiere_receta,
    requiere_control_lote,
    es_generico,
    medicamento_equivalente,
    imagen_url
)
VALUES
(1,'7771001','Clotrimazol Crema 1%','Clotrimazol','Crema tópica para tratamiento antifúngico.',18,'medicamento','crema','1%','tubo',15.00,25.00,FALSE,TRUE,TRUE,NULL,NULL),
(2,'7771002','Paracetamol 500mg Tableta','Paracetamol','Analgésico y antipirético.',15,'medicamento','tableta','500 mg','unidad',5.00,10.00,FALSE,TRUE,TRUE,NULL,NULL),
(3,'7771003','Amoxicilina 500mg Cápsula','Amoxicilina','Antibiótico de venta bajo receta.',17,'medicamento','capsula','500 mg','caja',12.00,20.00,TRUE,TRUE,TRUE,NULL,NULL),
(4,'7771004','Omeprazol 20mg Cápsula','Omeprazol','Cápsulas para control de acidez gástrica.',22,'medicamento','capsula','20 mg','caja',8.00,15.00,FALSE,TRUE,TRUE,NULL,NULL),
(5,'7771005','Ibuprofeno 400mg Tableta','Ibuprofeno','Antiinflamatorio y analgésico.',15,'medicamento','tableta','400 mg','unidad',7.00,14.00,FALSE,TRUE,TRUE,NULL,NULL),
(6,'7771006','Diclofenaco Gel 1%','Diclofenaco','Gel tópico para dolor muscular o articular.',16,'medicamento','gel','1%','tubo',10.00,18.00,FALSE,TRUE,TRUE,NULL,NULL),
(7,'7771007','Ketorolaco 10mg Tableta','Ketorolaco','Analgésico para dolor moderado a intenso.',15,'medicamento','tableta','10 mg','unidad',6.00,12.00,FALSE,TRUE,TRUE,NULL,NULL),
(8,'7771008','Naproxeno 550mg Tableta','Naproxeno','Antiinflamatorio no esteroideo.',15,'medicamento','tableta','550 mg','unidad',9.00,16.00,FALSE,TRUE,TRUE,NULL,NULL),
(9,'7771009','Azitromicina 500mg Tableta','Azitromicina','Antibiótico de venta bajo receta.',17,'medicamento','tableta','500 mg','caja',20.00,35.00,TRUE,TRUE,TRUE,NULL,NULL),
(10,'7771010','Ciprofloxacino 500mg Tableta','Ciprofloxacino','Antibiótico de venta bajo receta.',17,'medicamento','tableta','500 mg','caja',14.00,26.00,TRUE,TRUE,TRUE,NULL,NULL),
(11,'7771011','Loratadina 10mg Tableta','Loratadina','Antihistamínico para alergias.',4,'medicamento','tableta','10 mg','unidad',5.00,12.00,FALSE,TRUE,TRUE,NULL,NULL),
(12,'7771012','Jarabe Antigripal Ambroxol 120ml','Ambroxol','Jarabe para tos y congestión.',20,'medicamento','jarabe','15 mg/5 ml','frasco',12.00,22.00,FALSE,TRUE,TRUE,NULL,NULL),
(13,'7771013','Salbutamol Aerosol 100mcg','Salbutamol','Aerosol broncodilatador.',20,'medicamento','aerosol','100 mcg/dosis','unidad',25.00,45.00,TRUE,TRUE,TRUE,NULL,NULL),
(14,'7771014','Enalapril 10mg Tableta','Enalapril','Medicamento para presión arterial.',21,'medicamento','tableta','10 mg','unidad',8.00,15.00,FALSE,TRUE,TRUE,NULL,NULL),
(15,'7771015','Losartán 50mg Tableta','Losartán','Medicamento para presión arterial.',21,'medicamento','tableta','50 mg','unidad',10.00,18.00,FALSE,TRUE,TRUE,NULL,NULL),
(16,'7771016','Atorvastatina 20mg Tableta','Atorvastatina','Medicamento para control de colesterol.',21,'medicamento','tableta','20 mg','unidad',15.00,28.00,FALSE,TRUE,TRUE,NULL,NULL),
(17,'7771017','Dexametasona 4mg Tableta','Dexametasona','Corticoide de uso sistémico.',8,'medicamento','tableta','4 mg','unidad',8.00,16.00,TRUE,TRUE,TRUE,NULL,NULL),
(18,'7771018','Hidrocortisona Crema 1%','Hidrocortisona','Crema tópica con corticoide.',8,'medicamento','crema','1%','tubo',9.00,17.00,FALSE,TRUE,TRUE,NULL,NULL),
(19,'7771019','Complejo B Tableta','Complejo B','Suplemento vitamínico del complejo B.',23,'nutricion','tableta','B1+B6+B12','caja',6.00,12.00,FALSE,TRUE,TRUE,NULL,NULL),
(20,'7771020','Vitamina C 1g Tableta','Vitamina C','Suplemento antioxidante.',23,'nutricion','tableta','1 g','caja',7.00,14.00,FALSE,TRUE,TRUE,NULL,NULL),
(21,'7771021','Champú Anticaspa 200ml','N/A','Champú cosmético anticaspa.',26,'cuidado_personal','shampoo','N/A','frasco',12.00,22.00,FALSE,TRUE,FALSE,NULL,NULL),
(22,'7771022','Gel de Baño 500ml','N/A','Gel corporal de higiene diaria.',26,'higiene','gel','N/A','frasco',10.00,18.00,FALSE,TRUE,FALSE,NULL,NULL),
(23,'7771023','Pasta Dental 100ml','N/A','Pasta dental de uso diario.',27,'higiene','pasta_dental','N/A','unidad',8.00,15.00,FALSE,TRUE,FALSE,NULL,NULL),
(24,'7771024','Enjuague Bucal 500ml','N/A','Enjuague bucal antiséptico.',27,'higiene','enjuague','N/A','frasco',10.00,20.00,FALSE,TRUE,FALSE,NULL,NULL),
(25,'7771025','Protector Solar FPS50 120ml','N/A','Protector solar de amplio espectro.',25,'dermocosmetica','protector_solar','FPS 50','frasco',20.00,38.00,FALSE,TRUE,FALSE,NULL,NULL),
(26,'7771026','Crema Hidratante Facial 50ml','N/A','Crema facial hidratante.',24,'dermocosmetica','crema','N/A','tubo',18.00,35.00,FALSE,TRUE,FALSE,NULL,NULL),
(27,'7771027','Gasas Estériles 10x10','N/A','Paquete de gasas estériles.',28,'salud','caja','N/A','caja',4.00,8.00,FALSE,TRUE,FALSE,NULL,NULL),
(28,'7771028','Alcohol Antiséptico 250ml','N/A','Alcohol antiséptico de uso externo.',28,'salud','frasco','70%','frasco',3.00,6.00,FALSE,TRUE,FALSE,NULL,NULL),
(29,'7771029','Pañales Bebé Talla M x30','N/A','Pañales descartables talla M.',29,'bebe','caja','Talla M','caja',30.00,55.00,FALSE,TRUE,FALSE,NULL,NULL),
(30,'7771030','Leche Fórmula Infantil Etapa 1 400g','N/A','Leche de fórmula infantil.',30,'bebe','polvo','400 g','frasco',25.00,45.00,FALSE,TRUE,FALSE,NULL,NULL);

-- ============================================================================
-- 4. MEDICAMENTO - PRINCIPIO ACTIVO
-- ============================================================================
CREATE TABLE medicamento_principio_activo (
    id_medicamento INTEGER NOT NULL
        REFERENCES medicamento(id_medicamento)
        ON DELETE CASCADE,
    id_principio_activo INTEGER NOT NULL
        REFERENCES principio_activo(id_principio_activo)
        ON DELETE RESTRICT,
    cantidad DECIMAL(10,3),
    unidad VARCHAR(30),
    PRIMARY KEY (id_medicamento, id_principio_activo)
);
CREATE INDEX idx_mpa_medicamento
ON medicamento_principio_activo(id_medicamento);

CREATE INDEX idx_mpa_principio
ON medicamento_principio_activo(id_principio_activo);

INSERT INTO medicamento_principio_activo
(
    id_medicamento,
    id_principio_activo,
    cantidad,
    unidad
)
VALUES
(1,1,1.000,'%'),
(2,2,500.000,'mg'),
(3,3,500.000,'mg'),
(4,4,20.000,'mg'),
(5,5,400.000,'mg'),
(6,6,1.000,'%'),
(7,7,10.000,'mg'),
(8,8,550.000,'mg'),
(9,9,500.000,'mg'),
(10,10,500.000,'mg'),
(11,11,10.000,'mg'),
(12,12,15.000,'mg/5ml'),
(13,13,100.000,'mcg'),
(14,14,10.000,'mg'),
(15,15,50.000,'mg'),
(16,16,20.000,'mg'),
(17,17,4.000,'mg'),
(18,18,1.000,'%'),
(19,19,NULL,NULL),
(20,20,1.000,'g');

-- ============================================================================
-- 5. PROVEEDOR
-- ============================================================================
CREATE TABLE proveedor (
    id_proveedor SERIAL PRIMARY KEY,
    nombre_empresa VARCHAR(200) NOT NULL UNIQUE,
    contacto_nombre VARCHAR(100) NOT NULL,
    contacto_telefono VARCHAR(20) NOT NULL,
    contacto_email VARCHAR(100) UNIQUE,
    acepta_devoluciones BOOLEAN NOT NULL DEFAULT TRUE,
    frecuencia_visita VARCHAR(50) NOT NULL DEFAULT 'semanal',
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_proveedor_activo
ON proveedor(activo);

INSERT INTO proveedor
(
    id_proveedor,
    nombre_empresa,
    contacto_nombre,
    contacto_telefono,
    contacto_email,
    frecuencia_visita
)
VALUES
(1,'Distribuidora Farmacéutica Yacuiba SRL','Carlos Méndez','+591 71234567','carlos@farmayacuiba.com','semanal'),
(2,'FarmaBolivia Distribuciones','María López','+591 72345678','maria@farmabolivia.com','quincenal'),
(3,'Droguería Santa Cruz S.A.','Esteban Hurtado','+591 73456789','ventas@drogueriasc.com','mensual'),
(4,'Insumos de Cuidado Personal SRL','Lucía Rojas','+591 74567890','lucia@cuidadopersonal.com','quincenal'),
(5,'BebéSalud Distribuciones','Andrea Vaca','+591 75678901','andrea@bebesalud.com','mensual');

-- ============================================================================
-- 6. PERSONA
-- ============================================================================
CREATE TABLE persona (
    id_persona SERIAL PRIMARY KEY,
    ci VARCHAR(20) UNIQUE NOT NULL,
    nombre_completo VARCHAR(200) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    email VARCHAR(100) UNIQUE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_persona_ci
ON persona(ci);

INSERT INTO persona
(
    id_persona,
    ci,
    nombre_completo,
    telefono,
    email
)
VALUES
(1,'11223344','Roberto Gómez','+591 74444444','roberto@email.com'),
(2,'22334455','Carmen Rivero','+591 75555555','carmen@email.com'),
(3,'33445566','Luis Fernando Vaca','+591 76666666','luis@email.com'),
(4,'33770022','Luisa Torrez','+591 74539056','luisa@email.com'),
(5,'44546789','Marcos Portal','+591 78548157','marcos@email.com'),
(6,'10000006','Ana Lucía Morales','+591 71000006','ana.morales@email.com'),
(7,'10000007','Carlos Eduardo Rojas','+591 71000007','carlos.rojas@email.com'),
(8,'10000008','María Fernanda Quispe','+591 71000008','maria.quispe@email.com'),
(9,'10000009','José Andrés Villca','+591 71000009','jose.villca@email.com'),
(10,'10000010','Gabriela Elena Soto','+591 71000010','gabriela.soto@email.com'),
(11,'10000011','Raúl Antonio Céspedes','+591 71000011','raul.cespedes@email.com'),
(12,'10000012','Patricia Roxana Mendoza','+591 71000012','patricia.mendoza@email.com'),
(13,'10000013','Fernando Miguel Terceros','+591 71000013','fernando.terceros@email.com'),
(14,'10000014','Daniela Nicole Vargas','+591 71000014','daniela.vargas@email.com'),
(15,'10000015','Óscar René Salazar','+591 71000015','oscar.salazar@email.com'),
(16,'10000016','Verónica Alejandra Poma','+591 71000016','veronica.poma@email.com'),
(17,'10000017','Hugo Sebastián Arévalo','+591 71000017','hugo.arevalo@email.com'),
(18,'10000018','Cristina Patricia Flores','+591 71000018','cristina.flores@email.com'),
(19,'10000019','Mauricio Javier Condori','+591 71000019','mauricio.condori@email.com'),
(20,'10000020','Elena Beatriz Guzmán','+591 71000020','elena.guzman@email.com'),
(21,'10000021','Tomás Ignacio Lima','+591 71000021','tomas.lima@email.com'),
(22,'10000022','Sofía Alejandra Ríos','+591 71000022','sofia.rios@email.com'),
(23,'10000023','Diego Alfonso Mamani','+591 71000023','diego.mamani@email.com'),
(24,'10000024','Rocío Margarita Choque','+591 71000024','rocio.choque@email.com');

-- ============================================================================
-- 7. CLIENTE
-- ============================================================================
CREATE TABLE cliente (
    id_cliente SERIAL PRIMARY KEY,
    id_persona INTEGER NOT NULL UNIQUE
        REFERENCES persona(id_persona)
        ON DELETE CASCADE,
    fecha_nacimiento DATE,
    condiciones_cronicas TEXT,
    es_local BOOLEAN NOT NULL DEFAULT TRUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_cliente_persona
ON cliente(id_persona);

INSERT INTO cliente
(
    id_cliente,
    id_persona,
    fecha_nacimiento,
    condiciones_cronicas
)
VALUES
(1,1,'1985-03-15','Gastritis crónica'),
(2,2,'1990-07-22','Hipertensión'),
(3,3,'1978-11-05','Diabetes tipo 2');

-- ============================================================================
-- 8. ALERGIA + CLIENTE_ALERGIA
-- ============================================================================
CREATE TABLE IF NOT EXISTS alergia (
    id_alergia SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO alergia (id_alergia, nombre, descripcion)
VALUES
(1,'Penicilina','Alergia reportada a medicamentos de la familia de las penicilinas.'),
(2,'Sulfas','Alergia a sulfonamidas.'),
(3,'Ibuprofeno','Alergia reportada a ibuprofeno.'),
(4,'AINEs','Alergia o intolerancia a antiinflamatorios no esteroideos.')
ON CONFLICT (id_alergia) DO NOTHING;

-- 3. Crear tabla cliente_alergia
CREATE TABLE IF NOT EXISTS cliente_alergia (
    id_cliente INTEGER NOT NULL
        REFERENCES cliente(id_cliente)
        ON DELETE CASCADE,
    id_alergia INTEGER NOT NULL
        REFERENCES alergia(id_alergia)
        ON DELETE RESTRICT,
    gravedad VARCHAR(20) NOT NULL DEFAULT 'moderada'
        CHECK (gravedad IN ('leve','moderada','grave')),
    observacion TEXT,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_cliente, id_alergia)
);

CREATE INDEX IF NOT EXISTS idx_cliente_alergia_cliente
ON cliente_alergia(id_cliente);

CREATE INDEX IF NOT EXISTS idx_cliente_alergia_alergia
ON cliente_alergia(id_alergia);

INSERT INTO cliente_alergia (id_cliente, id_alergia, gravedad, observacion)
VALUES
(2,1,'grave','Evitar medicamentos con penicilinas.'),
(3,2,'moderada','Registrar en futuras dispensaciones.')
ON CONFLICT (id_cliente, id_alergia) DO NOTHING;

-- ============================================================================
-- 9. ALERGIA - PRINCIPIO ACTIVO
-- ============================================================================
CREATE TABLE alergia_principio_activo (
    id_alergia INTEGER NOT NULL
        REFERENCES alergia(id_alergia)
        ON DELETE CASCADE,
    id_principio_activo INTEGER NOT NULL
        REFERENCES principio_activo(id_principio_activo)
        ON DELETE CASCADE,
    PRIMARY KEY (id_alergia, id_principio_activo)
);
CREATE INDEX idx_alergia_principio_activo_alergia
ON alergia_principio_activo(id_alergia);

CREATE INDEX idx_alergia_principio_activo_principio
ON alergia_principio_activo(id_principio_activo);

INSERT INTO alergia_principio_activo
(
    id_alergia,
    id_principio_activo
)
VALUES
(1,3),   
(3,5),   
(4,5),   
(4,6),   
(4,8);   

-- ============================================================================
-- 10. EMPLEADO + REPARTIDOR
-- ============================================================================
CREATE TABLE IF NOT EXISTS empleado (
    id_empleado SERIAL PRIMARY KEY,
    id_persona INTEGER NOT NULL UNIQUE
        REFERENCES persona(id_persona)
        ON DELETE CASCADE,
    cargo VARCHAR(50) NOT NULL
        CHECK (cargo IN (
            'vendedor',
            'regente',
            'cajero',
            'administrador',
            'almacenero',
            'repartidor'
        )),
    fecha_ingreso DATE NOT NULL,
    esta_capacitado BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repartidor (
    id_repartidor SERIAL PRIMARY KEY,
    id_empleado INTEGER NOT NULL UNIQUE
        REFERENCES empleado(id_empleado)
        ON DELETE CASCADE,
    tipo_vehiculo VARCHAR(20) NOT NULL
        CHECK (tipo_vehiculo IN ('motocicleta','bicicleta','auto','pie')),
    placa_vehiculo VARCHAR(20),
    disponible BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_empleado_persona
ON empleado(id_persona);

CREATE INDEX IF NOT EXISTS idx_empleado_cargo
ON empleado(cargo);

CREATE INDEX IF NOT EXISTS idx_repartidor_empleado
ON repartidor(id_empleado);

INSERT INTO empleado (id_empleado, id_persona, cargo, fecha_ingreso, esta_capacitado) VALUES
(1, 6, 'regente', '2024-02-01', TRUE),
(2, 7, 'vendedor', '2024-02-01', TRUE),
(3, 8, 'cajero', '2024-03-15', TRUE),
(4, 9, 'administrador', '2023-11-01', TRUE),
(5, 10, 'almacenero', '2024-01-10', TRUE),
(6, 11, 'vendedor', '2024-04-01', TRUE),
(7, 12, 'regente', '2024-04-15', TRUE),
(8, 13, 'cajero', '2024-05-01', TRUE),
(9, 14, 'vendedor', '2024-06-01', TRUE),
(10, 15, 'almacenero', '2024-07-01', TRUE),
(11, 16, 'regente', '2024-08-01', TRUE),
(12, 17, 'vendedor', '2024-09-01', TRUE),
(13, 18, 'cajero', '2024-10-01', TRUE),
(14, 19, 'administrador', '2023-12-01', TRUE)
ON CONFLICT (id_empleado) DO NOTHING;
INSERT INTO empleado (id_empleado, id_persona, cargo, fecha_ingreso, esta_capacitado) VALUES
(15, 20, 'repartidor', '2025-01-01', TRUE),
(16, 21, 'repartidor', '2025-01-01', TRUE),
(17, 22, 'repartidor', '2025-01-01', TRUE),
(18, 23, 'repartidor', '2025-01-01', TRUE),
(19, 24, 'repartidor', '2025-01-01', TRUE)
ON CONFLICT (id_empleado) DO NOTHING;
INSERT INTO repartidor (id_repartidor, id_empleado, tipo_vehiculo, placa_vehiculo, disponible) VALUES
(1, 15, 'motocicleta', 'PL-001', TRUE),
(2, 16, 'motocicleta', 'PL-002', TRUE),
(3, 17, 'bicicleta', 'S/N', TRUE),
(4, 18, 'motocicleta', 'PL-004', TRUE),
(5, 19, 'motocicleta', 'PL-005', TRUE)
ON CONFLICT (id_repartidor) DO NOTHING;

-- ============================================================================
-- 11. SUCURSAL + UBICACION_INVENTARIO
-- ============================================================================
CREATE TABLE IF NOT EXISTS sucursal (
    id_sucursal SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL UNIQUE,
    ciudad VARCHAR(100) NOT NULL,
    direccion_texto VARCHAR(250) NOT NULL,
    telefono VARCHAR(20),
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_apertura DATE
);

INSERT INTO sucursal
(
    id_sucursal,
    nombre,
    ciudad,
    direccion_texto,
    telefono,
    fecha_apertura
)
VALUES
(1,'Main Farma Central','Yacuiba','Zona Central, Yacuiba, Tarija','+591 4 0000000','2024-01-01')
ON CONFLICT (id_sucursal) DO NOTHING;

CREATE TABLE IF NOT EXISTS ubicacion_inventario (
    id_ubicacion SERIAL PRIMARY KEY,
    id_sucursal INTEGER NOT NULL
        REFERENCES sucursal(id_sucursal)
        ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    pasillo VARCHAR(50),
    estante VARCHAR(50),
    temperatura_recomendada VARCHAR(50),
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (id_sucursal, nombre)
);

INSERT INTO ubicacion_inventario
(
    id_ubicacion,
    id_sucursal,
    nombre,
    pasillo,
    estante,
    temperatura_recomendada,
    activa
)
VALUES
(1,1,'Estante principal','A','1','15-25 C',TRUE),
(2,1,'Zona cuarentena','Q','1','15-25 C',FALSE)
ON CONFLICT (id_ubicacion) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_ubicacion_sucursal
ON ubicacion_inventario(id_sucursal);

-- ============================================================================
-- 12. LOTE_MEDICAMENTO
-- ============================================================================
CREATE TABLE lote_medicamento (
    id_lote SERIAL PRIMARY KEY,
    id_medicamento INTEGER NOT NULL
        REFERENCES medicamento(id_medicamento)
        ON DELETE RESTRICT,
    id_proveedor INTEGER
        REFERENCES proveedor(id_proveedor)
        ON DELETE SET NULL,
    numero_lote VARCHAR(50) NOT NULL,
    fecha_fabricacion DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    cantidad_inicial INTEGER NOT NULL CHECK (cantidad_inicial > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo','agotado','cuarentena','vencido','devuelto')),
    fecha_ingreso TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT,
    UNIQUE (id_medicamento, numero_lote),
    CHECK (fecha_vencimiento > fecha_fabricacion)
);
CREATE INDEX idx_lote_medicamento
ON lote_medicamento(id_medicamento);

CREATE INDEX idx_lote_proveedor
ON lote_medicamento(id_proveedor);

CREATE INDEX idx_lote_vencimiento
ON lote_medicamento(fecha_vencimiento);

CREATE INDEX idx_lote_estado
ON lote_medicamento(estado);

INSERT INTO lote_medicamento
(
    id_lote,
    id_medicamento,
    id_proveedor,
    numero_lote,
    fecha_fabricacion,
    fecha_vencimiento,
    cantidad_inicial,
    estado
)
VALUES
(1,1,1,'LOT-2026-001','2026-01-15','2027-01-15',100,'activo'),
(2,2,2,'LOT-2026-002','2026-02-01','2028-02-01',300,'activo'),
(3,3,1,'LOT-2026-003','2026-02-15','2027-02-15',80,'activo'),
(4,4,2,'LOT-2026-004','2026-03-01','2028-03-01',120,'activo'),
(5,5,1,'LOT-2026-005','2026-03-10','2027-09-10',150,'activo'),
(6,6,2,'LOT-2026-006','2026-03-15','2027-09-15',60,'activo'),
(7,7,3,'LOT-2026-007','2026-04-01','2027-10-01',50,'activo'),
(8,8,1,'LOT-2026-008','2026-04-05','2027-10-05',70,'activo'),
(9,9,2,'LOT-2026-009','2026-04-10','2027-10-10',40,'activo'),
(10,10,3,'LOT-2026-010','2026-04-15','2027-10-15',45,'activo'),
(11,11,1,'LOT-2026-011','2026-05-01','2028-05-01',90,'activo'),
(12,12,2,'LOT-2026-012','2026-05-05','2026-11-05',60,'activo'),
(13,13,3,'LOT-2026-013','2026-05-10','2027-11-10',35,'activo'),
(14,14,1,'LOT-2026-014','2026-05-15','2028-05-15',80,'activo'),
(15,15,2,'LOT-2026-015','2026-05-20','2028-05-20',85,'activo'),
(16,16,3,'LOT-2026-016','2026-05-25','2028-05-25',75,'activo'),
(17,17,1,'LOT-2026-017','2026-06-01','2027-12-01',30,'activo'),
(18,18,2,'LOT-2026-018','2026-06-05','2027-12-05',55,'activo'),
(19,19,3,'LOT-2026-019','2026-06-10','2028-06-10',100,'activo'),
(20,20,1,'LOT-2026-020','2026-06-15','2028-06-15',120,'activo'),
(21,21,4,'LOT-2026-021','2026-06-20','2028-06-20',60,'activo'),
(22,22,4,'LOT-2026-022','2026-06-25','2028-06-25',50,'activo'),
(23,23,4,'LOT-2026-023','2026-07-01','2028-07-01',100,'activo'),
(24,24,4,'LOT-2026-024','2026-07-05','2028-07-05',70,'activo'),
(25,25,4,'LOT-2026-025','2026-07-10','2028-07-10',40,'activo'),
(26,26,4,'LOT-2026-026','2026-07-15','2028-07-15',35,'activo'),
(27,27,5,'LOT-2026-027','2026-07-20','2029-07-20',80,'activo'),
(28,28,5,'LOT-2026-028','2026-07-25','2028-07-25',90,'activo'),
(29,29,5,'LOT-2026-029','2026-08-01','2028-08-01',60,'activo'),
(30,30,5,'LOT-2026-030','2026-08-05','2028-08-05',50,'activo'),
(31,2,2,'LOT-2026-031','2026-02-10','2026-12-20',40,'activo');

-- ============================================================================
-- 13. INVENTARIO
-- ============================================================================
CREATE TABLE inventario (
    id_inventario SERIAL PRIMARY KEY,
    id_lote INTEGER NOT NULL
        REFERENCES lote_medicamento(id_lote)
        ON DELETE RESTRICT,
    id_ubicacion INTEGER NOT NULL
        REFERENCES ubicacion_inventario(id_ubicacion)
        ON DELETE RESTRICT,
    cantidad_actual INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_actual >= 0),
    stock_minimo INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    stock_maximo INTEGER,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_lote, id_ubicacion),
    CHECK (stock_maximo IS NULL OR stock_maximo >= stock_minimo),
    CHECK (stock_maximo IS NULL OR cantidad_actual <= stock_maximo)
);
CREATE INDEX idx_inventario_lote
ON inventario(id_lote);

CREATE INDEX idx_inventario_ubicacion
ON inventario(id_ubicacion);

INSERT INTO inventario
(
    id_inventario,
    id_lote,
    id_ubicacion,
    cantidad_actual,
    stock_minimo,
    stock_maximo
)
VALUES
(1,1,1,0,10,200),
(2,2,1,0,50,500),
(3,3,1,0,20,200),
(4,4,1,0,20,200),
(5,5,1,0,30,300),
(6,6,1,0,10,150),
(7,7,1,0,10,100),
(8,8,1,0,10,150),
(9,9,1,0,10,100),
(10,10,1,0,10,100),
(11,11,1,0,20,200),
(12,12,1,0,15,150),
(13,13,1,0,10,100),
(14,14,1,0,15,150),
(15,15,1,0,15,150),
(16,16,1,0,15,150),
(17,17,1,0,5,80),
(18,18,1,0,10,120),
(19,19,1,0,20,200),
(20,20,1,0,25,250),
(21,21,1,0,10,150),
(22,22,1,0,10,150),
(23,23,1,0,20,250),
(24,24,1,0,15,150),
(25,25,1,0,10,120),
(26,26,1,0,10,100),
(27,27,1,0,20,200),
(28,28,1,0,20,200),
(29,29,1,0,15,150),
(30,30,1,0,10,120),
(31,31,1,0,10,80);

-- ============================================================================
-- 14. MOVIMIENTO_INVENTARIO
-- ============================================================================
CREATE TABLE movimiento_inventario (
    id_movimiento SERIAL PRIMARY KEY,
    id_inventario INTEGER NOT NULL
        REFERENCES inventario(id_inventario)
        ON DELETE RESTRICT,
    tipo_movimiento VARCHAR(20) NOT NULL
        CHECK (tipo_movimiento IN (
            'entrada',
            'salida',
            'ajuste',
            'devolucion',
            'cuarentena',
            'transferencia'
        )),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    motivo TEXT NOT NULL,
    id_empleado INTEGER
        REFERENCES empleado(id_empleado)
        ON DELETE SET NULL,
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movimiento_inventario_inventario
ON movimiento_inventario(id_inventario);

CREATE INDEX idx_movimiento_inventario_empleado
ON movimiento_inventario(id_empleado);

CREATE INDEX idx_movimiento_inventario_tipo
ON movimiento_inventario(tipo_movimiento);
INSERT INTO movimiento_inventario (id_movimiento, id_inventario, tipo_movimiento, cantidad, motivo, id_empleado)
VALUES
(1, 1, 'entrada', 50, 'Ingreso inicial por ajuste de inventario físico', 1),
(2, 2, 'entrada', 100, 'Recepción de lote de alta rotación', 2),
(3, 3, 'entrada', 30, 'Reposición de stock mínimo', 1),
(4, 4, 'entrada', 40, 'Ingreso por transferencia entre almacenes', 2),
(5, 5, 'entrada', 60, 'Recepción de proveedor autorizado', 1);
-- ============================================================================
-- 15. COMPRA + DETALLE_COMPRA
-- ============================================================================
CREATE TABLE compra (
    id_compra SERIAL PRIMARY KEY,
    id_proveedor INTEGER NOT NULL
        REFERENCES proveedor(id_proveedor)
        ON DELETE RESTRICT,
    numero_factura VARCHAR(50) UNIQUE NOT NULL,
    fecha_compra DATE NOT NULL,
    total_compra DECIMAL(12,2) NOT NULL CHECK (total_compra >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'completada'
        CHECK (estado IN ('pendiente','completada','devuelta_parcial','devuelta_total')),
    observaciones TEXT,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detalle_compra (
    id_detalle_compra SERIAL PRIMARY KEY,
    id_compra INTEGER NOT NULL
        REFERENCES compra(id_compra)
        ON DELETE CASCADE,
    id_medicamento INTEGER NOT NULL
        REFERENCES medicamento(id_medicamento)
        ON DELETE RESTRICT,
    id_lote INTEGER
        REFERENCES lote_medicamento(id_lote)
        ON DELETE SET NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
    CHECK (subtotal = cantidad * precio_unitario)
);
CREATE INDEX idx_compra_proveedor
ON compra(id_proveedor);

CREATE INDEX idx_compra_fecha
ON compra(fecha_compra);

CREATE INDEX idx_detalle_compra_compra
ON detalle_compra(id_compra);

CREATE INDEX idx_detalle_compra_medicamento
ON detalle_compra(id_medicamento);

CREATE INDEX idx_detalle_compra_lote
ON detalle_compra(id_lote);
INSERT INTO compra (id_compra, id_proveedor, numero_factura, fecha_compra, total_compra, estado, observaciones)
VALUES
(1, 1, 'FAC-001-2026', '2026-06-01', 350.00, 'completada', 'Compra de analgésicos y antibióticos'),
(2, 2, 'FAC-002-2026', '2026-06-05', 480.50, 'completada', 'Reposición trimestral de genéricos'),
(3, 3, 'FAC-003-2026', '2026-06-10', 1200.00, 'completada', 'Adquisición de productos especializados'),
(4, 4, 'FAC-004-2026', '2026-06-15', 210.00, 'completada', 'Insumos de cuidado personal y aseo'),
(5, 5, 'FAC-005-2026', '2026-06-20', 650.00, 'completada', 'Lote de productos para bebés y puericultura');

INSERT INTO detalle_compra (id_detalle_compra, id_compra, id_medicamento, id_lote, cantidad, precio_unitario, subtotal)
VALUES
(1, 1, 2, 2, 35, 10.00, 350.00),
(2, 2, 4, 4, 30, 16.01, 480.30),
(3, 3, 9, 9, 40, 30.00, 1200.00),
(4, 4, 21, 21, 15, 14.00, 210.00),
(5, 5, 29, 29, 10, 65.00, 650.00);
-- ============================================================================
-- 16. RECETA_MEDICA + DETALLE_RECETA
-- ============================================================================
CREATE TABLE receta_medica (
    id_receta SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL
        REFERENCES cliente(id_cliente)
        ON DELETE RESTRICT,
    numero_receta VARCHAR(50) UNIQUE NOT NULL,
    medico_prescriptor VARCHAR(200) NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_registro_farmacia TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE NOT NULL,
    observaciones_receta TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'vigente'
        CHECK (estado IN ('vigente','usada','vencida','anulada')),
    CHECK (fecha_vencimiento >= fecha_emision)
);

CREATE TABLE detalle_receta (
    id_detalle_receta SERIAL PRIMARY KEY,
    id_receta INTEGER NOT NULL
        REFERENCES receta_medica(id_receta)
        ON DELETE CASCADE,
    id_medicamento INTEGER
        REFERENCES medicamento(id_medicamento)
        ON DELETE RESTRICT,
    dosis VARCHAR(100) NOT NULL,
    frecuencia VARCHAR(100) NOT NULL,
    via_administracion VARCHAR(100) NOT NULL,
    duracion_tratamiento VARCHAR(100) NOT NULL,
    cantidad_prescrita INTEGER NOT NULL DEFAULT 1 CHECK (cantidad_prescrita > 0),
    indicaciones TEXT
);
CREATE INDEX idx_receta_cliente
ON receta_medica(id_cliente);

CREATE INDEX idx_receta_estado
ON receta_medica(estado);

CREATE INDEX idx_detalle_receta_receta
ON detalle_receta(id_receta);

CREATE INDEX idx_detalle_receta_medicamento
ON detalle_receta(id_medicamento);

INSERT INTO receta_medica (id_receta, id_cliente, numero_receta, medico_prescriptor, fecha_emision, fecha_vencimiento, estado)
VALUES
(1, 1, 'REC-2026-001', 'Dr. Jaime Alvarez', '2026-06-01', '2026-07-01', 'vigente'),
(2, 2, 'REC-2026-002', 'Dra. Patricia Rios', '2026-06-02', '2026-07-02', 'vigente'),
(3, 3, 'REC-2026-003', 'Dr. Roberto Mendoza', '2026-06-03', '2026-07-03', 'vigente'),
(4, 1, 'REC-2026-004', 'Dra. Sofia Camacho', '2026-06-04', '2026-07-04', 'vigente'),
(5, 2, 'REC-2026-005', 'Dr. Marco Antonio Paz', '2026-06-05', '2026-07-05', 'vigente');

INSERT INTO detalle_receta (id_detalle_receta, id_receta, id_medicamento, dosis, frecuencia, via_administracion, duracion_tratamiento, cantidad_prescrita, indicaciones)
VALUES
(1, 1, 3, '500 mg', 'Cada 8 horas', 'Oral', '7 días', 21, 'Tomar con abundante agua.'),
(2, 2, 9, '500 mg', 'Cada 24 horas', 'Oral', '5 días', 5, 'Completar todo el tratamiento.'),
(3, 3, 10, '500 mg', 'Cada 12 horas', 'Oral', '10 días', 20, 'No suspender sin consultar al médico.'),
(4, 4, 13, '100 mcg', 'Cada 6 horas según necesidad', 'Inhalatoria', '30 días', 1, 'Usar en crisis respiratorias.'),
(5, 5, 17, '4 mg', 'Cada 12 horas', 'Oral', '3 días', 6, 'Reducir la dosis progresivamente.');
-- ============================================================================
-- 17. SEGUIMIENTO_TRATAMIENTO
-- ============================================================================
CREATE TABLE seguimiento_tratamiento (
    id_seguimiento SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL
        REFERENCES cliente(id_cliente)
        ON DELETE CASCADE,
    id_medicamento INTEGER NOT NULL
        REFERENCES medicamento(id_medicamento)
        ON DELETE RESTRICT,
    id_receta INTEGER
        REFERENCES receta_medica(id_receta)
        ON DELETE SET NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    fecha_proxima_revision DATE,
    dosis VARCHAR(100),
    frecuencia VARCHAR(100),
    via_administracion VARCHAR(100),
    adherencia VARCHAR(20)
        CHECK (adherencia IS NULL OR adherencia IN ('alta','media','baja')),
    efectos_adversos TEXT,
    indicaciones TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo','completado','suspendido')),
    id_empleado INTEGER
        REFERENCES empleado(id_empleado)
        ON DELETE SET NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);
CREATE INDEX idx_seguimiento_tratamiento_cliente
ON seguimiento_tratamiento(id_cliente);

CREATE INDEX idx_seguimiento_tratamiento_medicamento
ON seguimiento_tratamiento(id_medicamento);

CREATE INDEX idx_seguimiento_tratamiento_empleado
ON seguimiento_tratamiento(id_empleado);

INSERT INTO seguimiento_tratamiento (id_seguimiento, id_cliente, id_medicamento, id_receta, fecha_inicio, fecha_fin, fecha_proxima_revision, dosis, frecuencia, via_administracion, adherencia, efectos_adversos, indicaciones, estado, id_empleado)
VALUES
(1, 1, 3, 1, '2026-06-01', '2026-06-08', '2026-06-15', '500 mg', 'Cada 8 horas', 'Oral', 'alta', 'Ninguno reportado', 'Controlar temperatura corporal.', 'activo', 1),
(2, 2, 9, 2, '2026-06-02', '2026-06-07', '2026-06-14', '500 mg', 'Cada 24 horas', 'Oral', 'media', 'Leve acidez estomacal', 'Tomar junto con los alimentos.', 'activo', 1),
(3, 3, 10, 3, '2026-06-03', '2026-06-13', '2026-06-20', '500 mg', 'Cada 12 horas', 'Oral', 'alta', 'Ninguno', 'Evitar exposición solar prolongada.', 'activo', 2),
(4, 1, 13, 4, '2026-06-04', NULL, '2026-07-04', '100 mcg', 'Según necesidad', 'Inhalatoria', 'alta', 'Ligera taquicardia temporal', 'Enjuagar la boca después de usar.', 'activo', 1),
(5, 2, 17, 5, '2026-06-05', '2026-06-08', '2026-06-12', '4 mg', 'Cada 12 horas', 'Oral', 'alta', 'Ninguno', 'Seguir pauta de desescalada.', 'completado', 2);

-- ============================================================================
-- 18. SEGUIMIENTO_CLIENTE
-- ============================================================================
CREATE TABLE seguimiento_cliente (
    id_seguimiento_cliente SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL
        REFERENCES cliente(id_cliente)
        ON DELETE CASCADE,
    id_empleado INTEGER
        REFERENCES empleado(id_empleado)
        ON DELETE SET NULL,
    tipo_atencion VARCHAR(40) NOT NULL
        CHECK (tipo_atencion IN (
            'presencial',
            'llamada_telefonica',
            'recordatorio_cronico',
            'orientacion',
            'reporte_reaccion_adversa'
        )),
    observacion_farmaceutica TEXT NOT NULL,
    requiere_llamada_posterior BOOLEAN NOT NULL DEFAULT FALSE,
    proxima_fecha_contacto DATE,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo','resuelto','cancelado')),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_seguimiento_cliente_cliente
ON seguimiento_cliente(id_cliente);

CREATE INDEX idx_seguimiento_cliente_empleado
ON seguimiento_cliente(id_empleado);

INSERT INTO seguimiento_cliente (id_seguimiento_cliente, id_cliente, id_empleado, tipo_atencion, observacion_farmaceutica, requiere_llamada_posterior, proxima_fecha_contacto, estado)
VALUES
(1, 1, 2, 'presencial', 'Cliente consulta por efectos secundarios de antibióticos. Se explica la importancia de probióticos.', TRUE, '2026-06-10', 'activo'),
(2, 2, 1, 'llamada_telefonica', 'Recordatorio de toma para paciente con tratamiento antihipertensivo prolongado.', TRUE, '2026-06-20', 'activo'),
(3, 3, 1, 'recordatorio_cronico', 'Control periódico de niveles de glucosa y uso de medicación.', TRUE, '2026-07-01', 'activo'),
(4, 1, 2, 'orientacion', 'Asesoría sobre almacenamiento correcto de inhaladores a temperatura ambiente.', FALSE, NULL, 'resuelto'),
(5, 2, 2, 'reporte_reaccion_adversa', 'Paciente reporta mareo leve con medicamento recetado; se deriva con médico tratante.', TRUE, '2026-06-08', 'activo');
-- ============================================================================
-- 19. REACCION_ADVERSA
-- ============================================================================
CREATE TABLE reaccion_adversa (
    id_reaccion SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL
        REFERENCES cliente(id_cliente)
        ON DELETE CASCADE,
    id_medicamento INTEGER
        REFERENCES medicamento(id_medicamento)
        ON DELETE SET NULL,
    gravedad VARCHAR(20) NOT NULL
        CHECK (gravedad IN ('leve','moderada','grave')),
    descripcion TEXT NOT NULL,
    fecha_reporte TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'reportada'
        CHECK (estado IN ('reportada','en_seguimiento','cerrada')),
    id_empleado INTEGER
        REFERENCES empleado(id_empleado)
        ON DELETE SET NULL
);
CREATE INDEX idx_reaccion_adversa_cliente
ON reaccion_adversa(id_cliente);

CREATE INDEX idx_reaccion_adversa_medicamento
ON reaccion_adversa(id_medicamento);
INSERT INTO reaccion_adversa (id_reaccion, id_cliente, id_medicamento, gravedad, descripcion, estado, id_empleado)
VALUES
(1, 2, 9, 'leve', 'Presentó náuseas leves tras la segunda dosis del antibiótico.', 'en_seguimiento', 1),
(2, 3, 10, 'moderada', 'Erupción cutánea leve en extremidades superiores.', 'reportada', 1),
(3, 1, 5, 'leve', 'Molestia gástrica leve al consumir con el estomago vacío.', 'cerrada', 2),
(4, 2, 11, 'leve', 'Somnolencia diurna pronunciada.', 'en_seguimiento', 2),
(5, 3, 14, 'moderada', 'Tos seca persistente característica del inhibidor.', 'reportada', 1);

-- ============================================================================
-- 20. METODO_PAGO + VENTA + DETALLE_VENTA + PAGO
-- ============================================================================
CREATE TABLE metodo_pago (
    id_metodo_pago SERIAL PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO metodo_pago
(
    id_metodo_pago,
    nombre
)
VALUES
(1,'efectivo'),
(2,'transferencia_bancaria'),
(3,'qr_simple'),
(4,'tarjeta_debito'),
(5,'tarjeta_credito');

CREATE TABLE venta (
    id_venta SERIAL PRIMARY KEY,
    id_empleado INTEGER
        REFERENCES empleado(id_empleado)
        ON DELETE SET NULL,
    id_cliente INTEGER
        REFERENCES cliente(id_cliente)
        ON DELETE SET NULL,
    fecha_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_venta DECIMAL(12,2) NOT NULL CHECK (total_venta >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'completada'
        CHECK (estado IN ('pendiente','completada','anulada','devuelta_parcial','devuelta_total')),
    observaciones TEXT
);

CREATE TABLE detalle_venta (
    id_detalle_venta SERIAL PRIMARY KEY,
    id_venta INTEGER NOT NULL
        REFERENCES venta(id_venta)
        ON DELETE CASCADE,
    id_medicamento INTEGER NOT NULL
        REFERENCES medicamento(id_medicamento)
        ON DELETE RESTRICT,
    id_lote INTEGER NOT NULL
        REFERENCES lote_medicamento(id_lote)
        ON DELETE RESTRICT,
    id_receta INTEGER
        REFERENCES receta_medica(id_receta)
        ON DELETE SET NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    descuento DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
    receta_presentada BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (subtotal = (cantidad * precio_unitario) - descuento),
    CHECK (receta_presentada = FALSE OR id_receta IS NOT NULL),
    CHECK (id_receta IS NULL OR receta_presentada = TRUE)
);

CREATE TABLE pago (
    id_pago SERIAL PRIMARY KEY,
    id_venta INTEGER NOT NULL
        REFERENCES venta(id_venta)
        ON DELETE CASCADE,
    id_metodo_pago INTEGER NOT NULL
        REFERENCES metodo_pago(id_metodo_pago)
        ON DELETE RESTRICT,
    monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
    referencia VARCHAR(100),
    fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado_pago VARCHAR(20) NOT NULL DEFAULT 'confirmado'
        CHECK (estado_pago IN ('pendiente','confirmado','anulado'))
);
CREATE INDEX idx_venta_empleado
ON venta(id_empleado);

CREATE INDEX idx_venta_cliente
ON venta(id_cliente);

CREATE INDEX idx_venta_fecha
ON venta(fecha_venta);

CREATE INDEX idx_detalle_venta_venta
ON detalle_venta(id_venta);

CREATE INDEX idx_detalle_venta_medicamento
ON detalle_venta(id_medicamento);

CREATE INDEX idx_detalle_venta_lote
ON detalle_venta(id_lote);

CREATE INDEX idx_detalle_venta_receta
ON detalle_venta(id_receta);

CREATE INDEX idx_pago_venta
ON pago(id_venta);

CREATE INDEX idx_pago_metodo
ON pago(id_metodo_pago);

INSERT INTO venta (id_venta, id_empleado, id_cliente, fecha_venta, total_venta, estado, observaciones)
VALUES
(1, 2, 1, CURRENT_TIMESTAMP, 35.00, 'completada', 'Venta mostrador con receta'),
(2, 2, 2, CURRENT_TIMESTAMP, 20.00, 'completada', 'Venta libre'),
(3, 1, 3, CURRENT_TIMESTAMP, 28.00, 'completada', 'Venta con cliente crónico');

INSERT INTO detalle_venta (id_detalle_venta, id_venta, id_medicamento, id_lote, id_receta, cantidad, precio_unitario, descuento, subtotal, receta_presentada)
VALUES
(1, 1, 3, 3, 1, 1, 20.00, 0.00, 20.00, TRUE),
(2, 1, 2, 2, NULL, 1, 15.00, 0.00, 15.00, FALSE),
(3, 2, 4, 4, NULL, 1, 20.00, 0.00, 20.00, FALSE),
(4, 3, 16, 16, NULL, 1, 28.00, 0.00, 28.00, FALSE);

INSERT INTO pago (id_pago, id_venta, id_metodo_pago, monto, referencia, estado_pago)
VALUES
(1, 1, 1, 35.00, 'Efectivo exacto', 'confirmado'),
(2, 2, 3, 20.00, 'QR Transferencia Movil #9821', 'confirmado'),
(3, 3, 4, 28.00, 'Tarjeta Débito POS 01', 'confirmado');
-- ============================================================================
-- 21. PEDIDO + DETALLE_PEDIDO + SEGUIMIENTO_PEDIDO + DELIVERY
-- Preparado para Fase 2.
-- ============================================================================
CREATE TABLE pedido (
    id_pedido SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL
        REFERENCES cliente(id_cliente)
        ON DELETE RESTRICT,
    id_venta INTEGER UNIQUE
        REFERENCES venta(id_venta)
        ON DELETE SET NULL,
    canal_pedido VARCHAR(20) NOT NULL
        CHECK (canal_pedido IN ('web','telefono','whatsapp','presencial')),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente','confirmado','preparando','en_camino','entregado','cancelado')),
    fecha_pedido TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT
);

CREATE TABLE detalle_pedido (
    id_detalle_pedido SERIAL PRIMARY KEY,
    id_pedido INTEGER NOT NULL
        REFERENCES pedido(id_pedido)
        ON DELETE CASCADE,
    id_medicamento INTEGER NOT NULL
        REFERENCES medicamento(id_medicamento)
        ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_solicitado DECIMAL(10,2)
        CHECK (precio_solicitado IS NULL OR precio_solicitado >= 0)
);

CREATE TABLE seguimiento_pedido (
    id_seguimiento SERIAL PRIMARY KEY,
    id_pedido INTEGER NOT NULL
        REFERENCES pedido(id_pedido)
        ON DELETE CASCADE,
    estado_anterior VARCHAR(20)
        CHECK (estado_anterior IS NULL OR estado_anterior IN (
            'pendiente','confirmado','preparando','en_camino','entregado','cancelado'
        )),
    estado_nuevo VARCHAR(20) NOT NULL
        CHECK (estado_nuevo IN (
            'pendiente','confirmado','preparando','en_camino','entregado','cancelado'
        )),
    fecha_cambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_empleado INTEGER
        REFERENCES empleado(id_empleado)
        ON DELETE SET NULL,
    observacion TEXT
);

CREATE TABLE direccion (
    id_direccion SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL
        REFERENCES cliente(id_cliente)
        ON DELETE CASCADE,
    calle VARCHAR(200) NOT NULL,
    numero VARCHAR(20),
    zona_barrio VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100) NOT NULL DEFAULT 'Yacuiba',
    referencia TEXT,
    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery (
    id_delivery SERIAL PRIMARY KEY,
    id_pedido INTEGER NOT NULL UNIQUE
        REFERENCES pedido(id_pedido)
        ON DELETE CASCADE,
    id_repartidor INTEGER
        REFERENCES repartidor(id_repartidor)
        ON DELETE SET NULL,
    id_direccion INTEGER NOT NULL
        REFERENCES direccion(id_direccion)
        ON DELETE RESTRICT,
    costo_envio DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (costo_envio >= 0),
    estado_envio VARCHAR(20) NOT NULL DEFAULT 'asignado'
        CHECK (estado_envio IN ('asignado','en_ruta','entregado','fallido')),
    fecha_programada TIMESTAMP,
    fecha_entrega_real TIMESTAMP,
    observaciones_entrega TEXT,
    CHECK (fecha_entrega_real IS NULL OR (
        fecha_programada IS NOT NULL AND fecha_entrega_real >= fecha_programada
    ))
);
CREATE INDEX idx_pedido_cliente
ON pedido(id_cliente);

CREATE INDEX idx_pedido_venta
ON pedido(id_venta);

CREATE INDEX idx_detalle_pedido_pedido
ON detalle_pedido(id_pedido);

CREATE INDEX idx_detalle_pedido_medicamento
ON detalle_pedido(id_medicamento);

CREATE INDEX idx_seguimiento_pedido_pedido
ON seguimiento_pedido(id_pedido);

CREATE INDEX idx_direccion_cliente
ON direccion(id_cliente);

CREATE INDEX idx_delivery_pedido
ON delivery(id_pedido);

CREATE INDEX idx_delivery_repartidor
ON delivery(id_repartidor);

CREATE INDEX idx_delivery_direccion
ON delivery(id_direccion);


INSERT INTO direccion (id_direccion,id_cliente,calle,numero,zona_barrio,ciudad,referencia,es_principal) VALUES
(1,1,'Av. Santa Cruz','123','Centro','Yacuiba','Frente a la plaza',TRUE),
(2,1,'Calle Bolívar','45','Centro','Yacuiba','Oficina',FALSE),
(4,2,'Av. Integración','300','Villa Rosario','Yacuiba','Trabajo',FALSE),
(5,3,'Av. Tarija','789','La Pampa','Yacuiba','Portón negro',TRUE);
-- ============================================================================
-- 22. FIDELIZACIÓN
-- Preparado para Fase 2.
-- ============================================================================
CREATE TABLE nivel_membresia (
    id_nivel SERIAL PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    puntos_minimos INTEGER NOT NULL CHECK (puntos_minimos >= 0),
    porcentaje_beneficio DECIMAL(5,2) NOT NULL DEFAULT 0
        CHECK (porcentaje_beneficio >= 0 AND porcentaje_beneficio <= 100),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE cliente_membresia (
    id_cliente_membresia SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL UNIQUE
        REFERENCES cliente(id_cliente)
        ON DELETE CASCADE,
    id_nivel INTEGER NOT NULL
        REFERENCES nivel_membresia(id_nivel)
        ON DELETE RESTRICT,
    puntos_acumulados INTEGER NOT NULL DEFAULT 0 CHECK (puntos_acumulados >= 0),
    fecha_afiliacion DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_expiracion DATE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK (fecha_expiracion IS NULL OR fecha_expiracion >= fecha_afiliacion)
);

CREATE TABLE movimiento_puntos (
    id_movimiento_puntos SERIAL PRIMARY KEY,
    id_cliente_membresia INTEGER NOT NULL
        REFERENCES cliente_membresia(id_cliente_membresia)
        ON DELETE CASCADE,
    tipo_movimiento VARCHAR(20) NOT NULL
        CHECK (tipo_movimiento IN ('acumulacion','canje','bonificacion','vencimiento','ajuste')),
    puntos INTEGER NOT NULL CHECK (puntos > 0),
    motivo TEXT NOT NULL,
    id_venta INTEGER
        REFERENCES venta(id_venta)
        ON DELETE SET NULL,
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_cliente_membresia_cliente
ON cliente_membresia(id_cliente);

CREATE INDEX idx_cliente_membresia_nivel
ON cliente_membresia(id_nivel);

CREATE INDEX idx_movimiento_puntos_membresia
ON movimiento_puntos(id_cliente_membresia);

CREATE INDEX idx_movimiento_puntos_venta
ON movimiento_puntos(id_venta);

-- ============================================================================
-- 23. OFERTA + OFERTA_MEDICAMENTO + DESCUENTO_MEMBRESIA
-- Preparado para Fase 2.
-- ============================================================================
CREATE TABLE oferta (
    id_oferta SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'programada'
        CHECK (estado IN ('programada','activa','finalizada','cancelada')),
    CHECK (fecha_fin >= fecha_inicio)
);

CREATE TABLE oferta_medicamento (
    id_oferta INTEGER NOT NULL
        REFERENCES oferta(id_oferta)
        ON DELETE CASCADE,
    id_medicamento INTEGER NOT NULL
        REFERENCES medicamento(id_medicamento)
        ON DELETE RESTRICT,
    porcentaje_descuento DECIMAL(5,2)
        CHECK (porcentaje_descuento >= 0 AND porcentaje_descuento <= 100),
    precio_promocional DECIMAL(10,2)
        CHECK (precio_promocional IS NULL OR precio_promocional >= 0),
    PRIMARY KEY (id_oferta, id_medicamento),
    CHECK (porcentaje_descuento IS NOT NULL OR precio_promocional IS NOT NULL)
);

CREATE TABLE descuento_membresia (
    id_descuento_membresia SERIAL PRIMARY KEY,
    id_nivel INTEGER NOT NULL
        REFERENCES nivel_membresia(id_nivel)
        ON DELETE CASCADE,
    id_medicamento INTEGER NOT NULL
        REFERENCES medicamento(id_medicamento)
        ON DELETE CASCADE,
    porcentaje_descuento DECIMAL(5,2) NOT NULL
        CHECK (porcentaje_descuento >= 0 AND porcentaje_descuento <= 100),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK (fecha_fin >= fecha_inicio)
);
CREATE INDEX idx_oferta_medicamento_oferta
ON oferta_medicamento(id_oferta);

CREATE INDEX idx_oferta_medicamento_medicamento
ON oferta_medicamento(id_medicamento);

CREATE INDEX idx_descuento_membresia_nivel
ON descuento_membresia(id_nivel);

CREATE INDEX idx_descuento_membresia_medicamento
ON descuento_membresia(id_medicamento);

-- ============================================================================
-- 24. DEVOLUCIÓN
-- ============================================================================
CREATE TABLE devolucion (
    id_devolucion SERIAL PRIMARY KEY,
    id_venta INTEGER NOT NULL
        REFERENCES venta(id_venta)
        ON DELETE RESTRICT,
    id_cliente INTEGER
        REFERENCES cliente(id_cliente)
        ON DELETE SET NULL,
    id_empleado INTEGER
        REFERENCES empleado(id_empleado)
        ON DELETE SET NULL,
    motivo TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'solicitada'
        CHECK (estado IN ('solicitada','aprobada','rechazada','completada')),
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP,
    CHECK (fecha_resolucion IS NULL OR fecha_resolucion >= fecha_solicitud)
);

CREATE TABLE detalle_devolucion (
    id_detalle_devolucion SERIAL PRIMARY KEY,
    id_devolucion INTEGER NOT NULL
        REFERENCES devolucion(id_devolucion)
        ON DELETE CASCADE,
    id_detalle_venta INTEGER NOT NULL
        REFERENCES detalle_venta(id_detalle_venta)
        ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    monto_reembolsado DECIMAL(12,2) NOT NULL CHECK (monto_reembolsado >= 0)
);
CREATE INDEX idx_devolucion_venta
ON devolucion(id_venta);

CREATE INDEX idx_devolucion_cliente
ON devolucion(id_cliente);

CREATE INDEX idx_detalle_devolucion_devolucion
ON detalle_devolucion(id_devolucion);

CREATE INDEX idx_detalle_devolucion_detalle_venta
ON detalle_devolucion(id_detalle_venta);

-- ============================================================================
-- 25. DEVOLUCIONES A PROVEEDOR
-- Permite aplicar la regla: solo proveedores que aceptan devoluciones.
-- ============================================================================
CREATE TABLE devolucion_proveedor (
    id_devolucion_proveedor SERIAL PRIMARY KEY,
    id_compra INTEGER NOT NULL
        REFERENCES compra(id_compra)
        ON DELETE RESTRICT,
    id_proveedor INTEGER NOT NULL
        REFERENCES proveedor(id_proveedor)
        ON DELETE RESTRICT,
    id_empleado INTEGER
        REFERENCES empleado(id_empleado)
        ON DELETE SET NULL,
    motivo TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'solicitada'
        CHECK (estado IN ('solicitada','aprobada','rechazada','completada')),
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP,
    CHECK (fecha_resolucion IS NULL OR fecha_resolucion >= fecha_solicitud)
);

CREATE TABLE detalle_devolucion_proveedor (
    id_detalle_devolucion_proveedor SERIAL PRIMARY KEY,
    id_devolucion_proveedor INTEGER NOT NULL
        REFERENCES devolucion_proveedor(id_devolucion_proveedor)
        ON DELETE CASCADE,
    id_detalle_compra INTEGER NOT NULL
        REFERENCES detalle_compra(id_detalle_compra)
        ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    monto_reembolsado DECIMAL(12,2) NOT NULL CHECK (monto_reembolsado >= 0)
);
CREATE INDEX idx_devolucion_proveedor_compra
ON devolucion_proveedor(id_compra);

CREATE INDEX idx_devolucion_proveedor_proveedor
ON devolucion_proveedor(id_proveedor);

CREATE INDEX idx_detalle_devolucion_proveedor_devolucion
ON detalle_devolucion_proveedor(id_devolucion_proveedor);

CREATE INDEX idx_detalle_devolucion_proveedor_compra
ON detalle_devolucion_proveedor(id_detalle_compra);
-- ============================================================================
-- 26. USUARIOS, ROLES Y PERMISOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario SERIAL PRIMARY KEY,
    id_empleado INTEGER UNIQUE
        REFERENCES empleado(id_empleado)
        ON DELETE SET NULL,
    nombre_usuario VARCHAR(100) NOT NULL UNIQUE,
    nombre VARCHAR(200),
    contrasena_hash TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP
);

INSERT INTO usuario
(
    id_usuario,
    id_empleado,
    nombre_usuario,
    contrasena_hash
)
VALUES
(1,1,'regente_mainfarma','HASH_DE_EJEMPLO'),
(2,2,'vendedor_mainfarma','HASH_DE_EJEMPLO')
ON CONFLICT (id_usuario) DO NOTHING;

CREATE TABLE IF NOT EXISTS rol (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO rol
(
    id_rol,
    nombre,
    descripcion
)
VALUES
(1,'Administrador','Acceso general.'),
(2,'Regente','Gestión de recetas y atención farmacéutica.'),
(3,'Vendedor','Gestión de ventas.'),
(4,'Almacenero','Gestión de inventario.')
ON CONFLICT (id_rol) DO NOTHING;

CREATE TABLE IF NOT EXISTS permiso (
    id_permiso SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    accion VARCHAR(30) NOT NULL,
    descripcion TEXT
);

INSERT INTO permiso
(
    id_permiso,
    nombre,
    accion,
    descripcion
)
VALUES
(1,'gestionar_ventas','CRUD','Registrar y administrar ventas.'),
(2,'gestionar_inventario','CRUD','Registrar movimientos y consultar stock.'),
(3,'gestionar_recetas','CRUD','Registrar y consultar recetas.'),
(4,'gestionar_clientes','CRUD','Gestionar datos de clientes.'),
(5,'gestionar_usuarios','CRUD','Gestionar usuarios y roles.')
ON CONFLICT (id_permiso) DO NOTHING;

CREATE TABLE IF NOT EXISTS usuario_rol (
    id_usuario INTEGER NOT NULL
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,
    id_rol INTEGER NOT NULL
        REFERENCES rol(id_rol)
        ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_rol)
);

INSERT INTO usuario_rol
(id_usuario, id_rol)
VALUES
(1,2),
(2,3)
ON CONFLICT (id_usuario, id_rol) DO NOTHING;

CREATE TABLE IF NOT EXISTS rol_permiso (
    id_rol INTEGER NOT NULL
        REFERENCES rol(id_rol)
        ON DELETE CASCADE,
    id_permiso INTEGER NOT NULL
        REFERENCES permiso(id_permiso)
        ON DELETE CASCADE,
    PRIMARY KEY (id_rol, id_permiso)
);

INSERT INTO rol_permiso
(id_rol, id_permiso)
VALUES
(1,1),(1,2),(1,3),(1,4),(1,5),
(2,2),(2,3),(2,4),
(3,1),(3,4),
(4,2),(4,4)
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

-- Índices al final
CREATE INDEX IF NOT EXISTS idx_usuario_empleado
ON usuario(id_empleado);

CREATE INDEX IF NOT EXISTS idx_usuario_rol_usuario
ON usuario_rol(id_usuario);

CREATE INDEX IF NOT EXISTS idx_usuario_rol_rol
ON usuario_rol(id_rol);

CREATE INDEX IF NOT EXISTS idx_rol_permiso_rol
ON rol_permiso(id_rol);

CREATE INDEX IF NOT EXISTS idx_rol_permiso_permiso
ON rol_permiso(id_permiso);
-- ============================================================================
-- 27. MÓDULO_SISTEMA
-- ============================================================================
CREATE TABLE modulo_sistema (
    id_modulo SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    fase_activacion INTEGER NOT NULL CHECK (fase_activacion IN (1,2,3)),
    activo BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_activacion TIMESTAMP,
    fecha_desactivacion TIMESTAMP
);
CREATE INDEX idx_modulo_sistema_activo
ON modulo_sistema(activo);

INSERT INTO modulo_sistema
(
    id_modulo,
    nombre,
    descripcion,
    fase_activacion,
    activo,
    fecha_activacion
)
VALUES
(1,'Operación farmacéutica','Ventas, compras, inventario y gestión de medicamentos.',1,TRUE,CURRENT_TIMESTAMP),
(2,'Atención farmacéutica','Recetas, alergias, seguimiento de tratamientos y reacciones adversas.',1,TRUE,CURRENT_TIMESTAMP),
(3,'Farmacia digital','Pedidos digitales, seguimiento de pedidos y delivery.',2,FALSE,NULL),
(4,'Fidelización','Membresías, puntos, ofertas y descuentos para clientes.',2,FALSE,NULL),
(5,'Expansión multisucursal','Gestión de sucursales, inventarios y transferencias entre sucursales.',3,FALSE,NULL),
(6,'Auditoría y trazabilidad','Registro avanzado de operaciones y eventos del sistema.',3,FALSE,NULL);

-- ============================================================================
-- 28. TRANSFERENCIA ENTRE SUCURSALES
-- ============================================================================
CREATE TABLE IF NOT EXISTS transferencia_sucursal (
    id_transferencia SERIAL PRIMARY KEY,
    sucursal_origen INTEGER NOT NULL
        REFERENCES sucursal(id_sucursal)
        ON DELETE RESTRICT,
    sucursal_destino INTEGER NOT NULL
        REFERENCES sucursal(id_sucursal)
        ON DELETE RESTRICT,
    estado VARCHAR(20) NOT NULL DEFAULT 'solicitada'
        CHECK (estado IN ('solicitada','aprobada','en_transito','recibida','cancelada')),
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_recepcion TIMESTAMP,
    id_empleado INTEGER
        REFERENCES empleado(id_empleado)
        ON DELETE SET NULL,
    CHECK (sucursal_origen <> sucursal_destino),
    CHECK (fecha_recepcion IS NULL OR fecha_recepcion >= fecha_solicitud)
);

CREATE INDEX IF NOT EXISTS idx_transferencia_origen
ON transferencia_sucursal(sucursal_origen);

CREATE INDEX IF NOT EXISTS idx_transferencia_destino
ON transferencia_sucursal(sucursal_destino);

CREATE TABLE IF NOT EXISTS detalle_transferencia (
    id_detalle_transferencia SERIAL PRIMARY KEY,
    id_transferencia INTEGER NOT NULL
        REFERENCES transferencia_sucursal(id_transferencia)
        ON DELETE CASCADE,
    id_lote INTEGER NOT NULL
        REFERENCES lote_medicamento(id_lote)
        ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0)
);

CREATE INDEX IF NOT EXISTS idx_detalle_transferencia_transferencia
ON detalle_transferencia(id_transferencia);

CREATE INDEX IF NOT EXISTS idx_detalle_transferencia_lote
ON detalle_transferencia(id_lote);

-- ============================================================================
-- 30. FUNCIONES Y TRIGGERS
-- ============================================================================

-- Stock: entrada, salida y devolución.
CREATE OR REPLACE FUNCTION fn_actualizar_stock_movimiento()
RETURNS TRIGGER AS $$
DECLARE
    v_stock INTEGER;
BEGIN
    SELECT cantidad_actual
    INTO v_stock
    FROM inventario
    WHERE id_inventario = NEW.id_inventario
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El inventario % no existe.', NEW.id_inventario;
    END IF;

    IF NEW.tipo_movimiento = 'entrada' THEN
        UPDATE inventario
        SET cantidad_actual = cantidad_actual + NEW.cantidad,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_inventario = NEW.id_inventario;

    ELSIF NEW.tipo_movimiento = 'salida' THEN
        IF v_stock < NEW.cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente. Disponible: %, solicitado: %.',
                v_stock,
                NEW.cantidad;
        END IF;

        UPDATE inventario
        SET cantidad_actual = cantidad_actual - NEW.cantidad,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_inventario = NEW.id_inventario;

    ELSIF NEW.tipo_movimiento = 'devolucion' THEN
        UPDATE inventario
        SET cantidad_actual = cantidad_actual + NEW.cantidad,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_inventario = NEW.id_inventario;

    ELSIF NEW.tipo_movimiento IN ('ajuste','cuarentena','transferencia') THEN
        RAISE EXCEPTION
            'El tipo de movimiento % no está habilitado en Fase 1.',
            NEW.tipo_movimiento;
    ELSE
        RAISE EXCEPTION 'Tipo de movimiento no reconocido: %.', NEW.tipo_movimiento;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_stock_movimiento
BEFORE INSERT ON movimiento_inventario
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_stock_movimiento();

CREATE OR REPLACE FUNCTION fn_bloquear_movimiento_inventario()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Los movimientos de inventario no deben modificarse ni eliminarse.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_a_bloquear_movimiento_inventario
BEFORE UPDATE OR DELETE ON movimiento_inventario
FOR EACH ROW
EXECUTE FUNCTION fn_bloquear_movimiento_inventario();

-- FEFO: asigna automáticamente el lote activo con vencimiento más próximo.
CREATE OR REPLACE FUNCTION fn_asignar_lote_fefo()
RETURNS TRIGGER AS $$
DECLARE
    v_id_lote INTEGER;
BEGIN
    SELECT l.id_lote
    INTO v_id_lote
    FROM lote_medicamento l
    JOIN medicamento m
        ON m.id_medicamento = l.id_medicamento
       AND m.activo = TRUE
    JOIN (
        SELECT
            i.id_lote,
            SUM(i.cantidad_actual) AS stock_total
        FROM inventario i
        JOIN ubicacion_inventario u
            ON u.id_ubicacion = i.id_ubicacion
           AND u.activa = TRUE
        GROUP BY i.id_lote
    ) s
        ON s.id_lote = l.id_lote
    WHERE l.id_medicamento = NEW.id_medicamento
      AND l.estado = 'activo'
      AND l.fecha_vencimiento >= CURRENT_DATE
      AND s.stock_total >= NEW.cantidad
    ORDER BY l.fecha_vencimiento ASC, l.fecha_ingreso ASC, l.id_lote
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No existe un lote activo, vigente y con stock suficiente para el medicamento %.',
            NEW.id_medicamento;
    END IF;

    NEW.id_lote := v_id_lote;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_a_asignar_lote_fefo
BEFORE INSERT ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_asignar_lote_fefo();

-- Validar que lote y medicamento coincidan.
CREATE OR REPLACE FUNCTION fn_validar_medicamento_lote()
RETURNS TRIGGER AS $$
DECLARE
    v_medicamento_activo BOOLEAN;
    v_lote_medicamento INTEGER;
BEGIN
    SELECT activo
    INTO v_medicamento_activo
    FROM medicamento
    WHERE id_medicamento = NEW.id_medicamento;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El medicamento % no existe.', NEW.id_medicamento;
    END IF;

    IF NOT v_medicamento_activo THEN
        RAISE EXCEPTION 'El medicamento % está inactivo.', NEW.id_medicamento;
    END IF;

    SELECT id_medicamento
    INTO v_lote_medicamento
    FROM lote_medicamento
    WHERE id_lote = NEW.id_lote;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El lote % no existe.', NEW.id_lote;
    END IF;

    IF v_lote_medicamento <> NEW.id_medicamento THEN
        RAISE EXCEPTION
            'El lote % no corresponde al medicamento %.',
            NEW.id_lote,
            NEW.id_medicamento;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_b_validar_medicamento_lote
BEFORE INSERT OR UPDATE ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_validar_medicamento_lote();

-- Validar receta, cliente, vigencia y que el medicamento esté en la receta.
CREATE OR REPLACE FUNCTION fn_validar_receta()
RETURNS TRIGGER AS $$
DECLARE
    v_requiere BOOLEAN;
    v_receta RECORD;
    v_prescrita INTEGER;
    v_dispensada INTEGER;
BEGIN
    SELECT requiere_receta
    INTO v_requiere
    FROM medicamento
    WHERE id_medicamento = NEW.id_medicamento;

    IF NOT COALESCE(v_requiere, FALSE) THEN
        RETURN NEW;
    END IF;

    IF NEW.receta_presentada IS NOT TRUE OR NEW.id_receta IS NULL THEN
        RAISE EXCEPTION
            'El medicamento % requiere receta médica presentada y registrada.',
            NEW.id_medicamento;
    END IF;

    SELECT
        r.id_cliente AS cliente_receta,
        r.estado,
        r.fecha_vencimiento,
        v.id_cliente AS cliente_venta
    INTO v_receta
    FROM venta v
    JOIN receta_medica r
        ON r.id_receta = NEW.id_receta
    WHERE v.id_venta = NEW.id_venta;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró la venta % o la receta %.', NEW.id_venta, NEW.id_receta;
    END IF;

    IF v_receta.cliente_venta IS NULL THEN
        RAISE EXCEPTION 'La venta % debe tener cliente para validar la receta.', NEW.id_venta;
    END IF;

    IF v_receta.estado <> 'vigente' THEN
        RAISE EXCEPTION 'La receta % no está vigente.', NEW.id_receta;
    END IF;

    IF v_receta.fecha_vencimiento < CURRENT_DATE THEN
        RAISE EXCEPTION 'La receta % está vencida.', NEW.id_receta;
    END IF;

    IF v_receta.cliente_receta <> v_receta.cliente_venta THEN
        RAISE EXCEPTION
            'La receta % pertenece a un cliente distinto al de la venta.',
            NEW.id_receta;
    END IF;

    SELECT cantidad_prescrita
    INTO v_prescrita
    FROM detalle_receta
    WHERE id_receta = NEW.id_receta
      AND id_medicamento = NEW.id_medicamento;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'El medicamento % no está incluido en la receta %.',
            NEW.id_medicamento,
            NEW.id_receta;
    END IF;

    SELECT COALESCE(SUM(dv.cantidad),0)
    INTO v_dispensada
    FROM detalle_venta dv
    WHERE dv.id_receta = NEW.id_receta
      AND dv.id_medicamento = NEW.id_medicamento
      AND dv.id_detalle_venta <> COALESCE(NEW.id_detalle_venta,0);

    IF v_dispensada + NEW.cantidad > v_prescrita THEN
        RAISE EXCEPTION
            'La cantidad solicitada (%) supera la cantidad prescrita (%). Ya dispensado: %.',
            NEW.cantidad, v_prescrita, v_dispensada;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_c_validar_receta_venta
BEFORE INSERT OR UPDATE ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_validar_receta();

-- Validar alergias.
CREATE OR REPLACE FUNCTION fn_validar_alergias_venta()
RETURNS TRIGGER AS $$
DECLARE
    v_cliente INTEGER;
    v_conflicto RECORD;
BEGIN
    SELECT id_cliente
    INTO v_cliente
    FROM venta
    WHERE id_venta = NEW.id_venta;

    IF v_cliente IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT
        a.nombre AS nombre_alergia,
        pa.nombre AS nombre_principio
    INTO v_conflicto
    FROM cliente_alergia ca
    JOIN alergia a
        ON a.id_alergia = ca.id_alergia
       AND a.activo = TRUE
    JOIN alergia_principio_activo apa
        ON apa.id_alergia = ca.id_alergia
    JOIN principio_activo pa
        ON pa.id_principio_activo = apa.id_principio_activo
       AND pa.activo = TRUE
    JOIN medicamento_principio_activo mpa
        ON mpa.id_principio_activo = apa.id_principio_activo
    JOIN medicamento m
        ON m.id_medicamento = mpa.id_medicamento
       AND m.activo = TRUE
    WHERE ca.id_cliente = v_cliente
      AND mpa.id_medicamento = NEW.id_medicamento
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION
            'Venta bloqueada por seguridad: el cliente tiene alergia % relacionada con %.',
            v_conflicto.nombre_alergia,
            v_conflicto.nombre_principio;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_d_validar_alergias_venta
BEFORE INSERT OR UPDATE ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_validar_alergias_venta();

-- Bloquear modificación directa de detalles de venta.
CREATE OR REPLACE FUNCTION fn_bloquear_detalle_venta()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Los detalles de venta no deben modificarse ni eliminarse directamente.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_a_bloquear_detalle_venta
BEFORE UPDATE OR DELETE ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_bloquear_detalle_venta();

-- Recalcular total de venta.
CREATE OR REPLACE FUNCTION fn_recalcular_total_venta()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE venta
    SET total_venta = COALESCE((
        SELECT SUM(dv.subtotal)
        FROM detalle_venta dv
        WHERE dv.id_venta = NEW.id_venta
    ), 0)
    WHERE id_venta = NEW.id_venta;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_e_recalcular_total_venta
AFTER INSERT ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_recalcular_total_venta();

-- Salida automática de inventario por venta.
CREATE OR REPLACE FUNCTION fn_registrar_salida_automatica()
RETURNS TRIGGER AS $$
DECLARE
    v_id_inventario INTEGER;
    v_id_empleado INTEGER;
BEGIN
    SELECT id_empleado
    INTO v_id_empleado
    FROM venta
    WHERE id_venta = NEW.id_venta;

    SELECT i.id_inventario
    INTO v_id_inventario
    FROM inventario i
    JOIN lote_medicamento l
        ON l.id_lote = i.id_lote
       AND l.estado = 'activo'
    JOIN ubicacion_inventario u
        ON u.id_ubicacion = i.id_ubicacion
       AND u.activa = TRUE
    WHERE i.id_lote = NEW.id_lote
      AND i.cantidad_actual >= NEW.cantidad
    ORDER BY i.fecha_actualizacion DESC, i.id_inventario
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No hay stock suficiente en una ubicación activa para el lote %.',
            NEW.id_lote;
    END IF;

    INSERT INTO movimiento_inventario (
        id_inventario,
        tipo_movimiento,
        cantidad,
        fecha_movimiento,
        motivo,
        id_empleado
    ) VALUES (
        v_id_inventario,
        'salida',
        NEW.cantidad,
        CURRENT_TIMESTAMP,
        'Venta automática - detalle_venta ID: ' ||
        COALESCE(NEW.id_detalle_venta::TEXT, 'N/A') ||
        ' - venta ID: ' ||
        COALESCE(NEW.id_venta::TEXT, 'N/A'),
        v_id_empleado
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_f_registrar_salida_venta
AFTER INSERT ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_registrar_salida_automatica();

-- Validar lote en compra.
CREATE OR REPLACE FUNCTION fn_validar_lote_detalle_compra()
RETURNS TRIGGER AS $$
DECLARE
    v_medicamento_activo BOOLEAN;
    v_lote RECORD;
BEGIN
    IF NEW.id_lote IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT activo
    INTO v_medicamento_activo
    FROM medicamento
    WHERE id_medicamento = NEW.id_medicamento;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El medicamento % no existe.', NEW.id_medicamento;
    END IF;

    IF NOT v_medicamento_activo THEN
        RAISE EXCEPTION 'El medicamento % está inactivo.', NEW.id_medicamento;
    END IF;

    SELECT id_medicamento, estado, fecha_vencimiento
    INTO v_lote
    FROM lote_medicamento
    WHERE id_lote = NEW.id_lote;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El lote % no existe.', NEW.id_lote;
    END IF;

    IF v_lote.id_medicamento <> NEW.id_medicamento THEN
        RAISE EXCEPTION
            'El lote % no corresponde al medicamento %.',
            NEW.id_lote,
            NEW.id_medicamento;
    END IF;

    IF v_lote.fecha_vencimiento < CURRENT_DATE THEN
        RAISE EXCEPTION 'El lote % está vencido.', NEW.id_lote;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_b_validar_lote_detalle_compra
BEFORE INSERT OR UPDATE ON detalle_compra
FOR EACH ROW
EXECUTE FUNCTION fn_validar_lote_detalle_compra();

-- Bloquear modificación directa de detalles de compra.
CREATE OR REPLACE FUNCTION fn_bloquear_detalle_compra()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Los detalles de compra no deben modificarse ni eliminarse directamente.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_a_bloquear_detalle_compra
BEFORE UPDATE OR DELETE ON detalle_compra
FOR EACH ROW
EXECUTE FUNCTION fn_bloquear_detalle_compra();

-- Entrada automática de inventario por compra completada.
CREATE OR REPLACE FUNCTION fn_entrada_compra()
RETURNS TRIGGER AS $$
DECLARE
    v_id_inventario INTEGER;
    v_estado_compra VARCHAR(20);
BEGIN
    IF NEW.id_lote IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT estado
    INTO v_estado_compra
    FROM compra
    WHERE id_compra = NEW.id_compra;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La compra % no existe.', NEW.id_compra;
    END IF;

    IF v_estado_compra <> 'completada' THEN
        RETURN NEW;
    END IF;

    SELECT i.id_inventario
    INTO v_id_inventario
    FROM inventario i
    JOIN ubicacion_inventario u
        ON u.id_ubicacion = i.id_ubicacion
       AND u.activa = TRUE
    WHERE i.id_lote = NEW.id_lote
    ORDER BY i.fecha_actualizacion DESC, i.id_inventario
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No existe inventario activo para el lote %.',
            NEW.id_lote;
    END IF;

    INSERT INTO movimiento_inventario (
        id_inventario,
        tipo_movimiento,
        cantidad,
        motivo
    ) VALUES (
        v_id_inventario,
        'entrada',
        NEW.cantidad,
        'Entrada por compra, detalle_compra ID: ' || NEW.id_detalle_compra
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_d_entrada_compra
AFTER INSERT ON detalle_compra
FOR EACH ROW
EXECUTE FUNCTION fn_entrada_compra();

-- Recalcular total de compra.
CREATE OR REPLACE FUNCTION fn_recalcular_total_compra()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE compra
    SET total_compra = COALESCE((
        SELECT SUM(dc.subtotal)
        FROM detalle_compra dc
        WHERE dc.id_compra = NEW.id_compra
    ), 0)
    WHERE id_compra = NEW.id_compra;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_e_recalcular_total_compra
AFTER INSERT ON detalle_compra
FOR EACH ROW
EXECUTE FUNCTION fn_recalcular_total_compra();

-- Validar pagos.
CREATE OR REPLACE FUNCTION fn_validar_pago_no_exceder()
RETURNS TRIGGER AS $$
DECLARE
    v_total DECIMAL(12,2);
    v_suma DECIMAL(12,2);
BEGIN
    IF NEW.estado_pago = 'anulado' THEN
        RETURN NEW;
    END IF;

    SELECT total_venta
    INTO v_total
    FROM venta
    WHERE id_venta = NEW.id_venta;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La venta % no existe.', NEW.id_venta;
    END IF;

    IF TG_OP = 'INSERT' THEN
        SELECT COALESCE(SUM(monto), 0)
        INTO v_suma
        FROM pago
        WHERE id_venta = NEW.id_venta
          AND estado_pago <> 'anulado';
    ELSE
        SELECT COALESCE(SUM(monto), 0)
        INTO v_suma
        FROM pago
        WHERE id_venta = NEW.id_venta
          AND estado_pago <> 'anulado'
          AND id_pago <> NEW.id_pago;
    END IF;

    IF v_suma + NEW.monto > v_total THEN
        RAISE EXCEPTION
            'Los pagos registrados (%) superan el total de la venta (%).',
            v_suma + NEW.monto,
            v_total;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_pago_no_exceder
BEFORE INSERT OR UPDATE ON pago
FOR EACH ROW
EXECUTE FUNCTION fn_validar_pago_no_exceder();

CREATE OR REPLACE FUNCTION fn_bloquear_pago_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Los pagos no deben eliminarse. Use estado anulado.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_a_bloquear_pago_delete
BEFORE DELETE ON pago
FOR EACH ROW
EXECUTE FUNCTION fn_bloquear_pago_delete();


-- --------------------------------------------------------------------------
-- Validación de proveedor activo al registrar una compra.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_proveedor_compra()
RETURNS TRIGGER AS $$
DECLARE
    v_activo BOOLEAN;
BEGIN
    SELECT activo INTO v_activo
    FROM proveedor
    WHERE id_proveedor = NEW.id_proveedor;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El proveedor % no existe.', NEW.id_proveedor;
    END IF;

    IF v_activo IS NOT TRUE THEN
        RAISE EXCEPTION 'El proveedor % está inactivo y no puede registrar nuevas compras.', NEW.id_proveedor;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_proveedor_compra
BEFORE INSERT OR UPDATE OF id_proveedor ON compra
FOR EACH ROW
EXECUTE FUNCTION fn_validar_proveedor_compra();

-- --------------------------------------------------------------------------
-- Validación de método de pago activo y venta válida.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_pago_operacion()
RETURNS TRIGGER AS $$
DECLARE
    v_metodo_activo BOOLEAN;
    v_estado_venta VARCHAR(20);
BEGIN
    SELECT activo INTO v_metodo_activo
    FROM metodo_pago
    WHERE id_metodo_pago = NEW.id_metodo_pago;

    IF NOT FOUND OR v_metodo_activo IS NOT TRUE THEN
        RAISE EXCEPTION 'El método de pago % no está activo.', NEW.id_metodo_pago;
    END IF;

    SELECT estado INTO v_estado_venta
    FROM venta
    WHERE id_venta = NEW.id_venta;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La venta % no existe.', NEW.id_venta;
    END IF;

    IF v_estado_venta IN ('anulada','devuelta_total') THEN
        RAISE EXCEPTION 'No se puede registrar un pago para una venta en estado %.', v_estado_venta;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_pago_operacion
BEFORE INSERT OR UPDATE ON pago
FOR EACH ROW
EXECUTE FUNCTION fn_validar_pago_operacion();

-- --------------------------------------------------------------------------
-- Una venta solo puede completarse cuando tiene detalles y pago suficiente.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_cierre_venta()
RETURNS TRIGGER AS $$
DECLARE
    v_detalles INTEGER;
    v_total DECIMAL(12,2);
    v_pagado DECIMAL(12,2);
    v_empleado_activo BOOLEAN;
    v_cliente_activo BOOLEAN;
BEGIN
    IF NEW.estado <> 'completada' OR (TG_OP = 'UPDATE' AND OLD.estado = 'completada') THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*), COALESCE(SUM(subtotal),0)
    INTO v_detalles, v_total
    FROM detalle_venta
    WHERE id_venta = NEW.id_venta;

    IF v_detalles = 0 THEN
        RAISE EXCEPTION 'La venta % no puede completarse sin detalles.', NEW.id_venta;
    END IF;

    SELECT COALESCE(SUM(monto),0)
    INTO v_pagado
    FROM pago
    WHERE id_venta = NEW.id_venta
      AND estado_pago = 'confirmado';

    IF v_pagado < v_total THEN
        RAISE EXCEPTION 'La venta % no puede completarse. Total: %, pagado: %.', NEW.id_venta, v_total, v_pagado;
    END IF;

    IF NEW.id_empleado IS NOT NULL THEN
        SELECT activo INTO v_empleado_activo
        FROM empleado
        WHERE id_empleado = NEW.id_empleado;
        IF v_empleado_activo IS DISTINCT FROM TRUE THEN
            RAISE EXCEPTION 'El empleado % está inactivo.', NEW.id_empleado;
        END IF;
    END IF;

    IF NEW.id_cliente IS NOT NULL THEN
        SELECT activo INTO v_cliente_activo
        FROM cliente
        WHERE id_cliente = NEW.id_cliente;
        IF v_cliente_activo IS DISTINCT FROM TRUE THEN
            RAISE EXCEPTION 'El cliente % está inactivo.', NEW.id_cliente;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_cierre_venta
BEFORE INSERT OR UPDATE OF estado ON venta
FOR EACH ROW
EXECUTE FUNCTION fn_validar_cierre_venta();

-- --------------------------------------------------------------------------
-- Lote válido: activo, vigente y correspondiente al medicamento.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_lote_venta()
RETURNS TRIGGER AS $$
DECLARE
    v_lote RECORD;
BEGIN
    SELECT id_medicamento, estado, fecha_vencimiento
    INTO v_lote
    FROM lote_medicamento
    WHERE id_lote = NEW.id_lote;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El lote % no existe.', NEW.id_lote;
    END IF;

    IF v_lote.id_medicamento <> NEW.id_medicamento THEN
        RAISE EXCEPTION 'El lote % no corresponde al medicamento %.', NEW.id_lote, NEW.id_medicamento;
    END IF;

    IF v_lote.estado <> 'activo' THEN
        RAISE EXCEPTION 'El lote % no está activo. Estado actual: %.', NEW.id_lote, v_lote.estado;
    END IF;

    IF v_lote.fecha_vencimiento < CURRENT_DATE THEN
        RAISE EXCEPTION 'El lote % está vencido.', NEW.id_lote;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_lote_venta
BEFORE INSERT OR UPDATE ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_validar_lote_venta();

-- --------------------------------------------------------------------------
-- Solo proveedores que aceptan devoluciones pueden registrar devoluciones.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_devolucion_proveedor()
RETURNS TRIGGER AS $$
DECLARE
    v_proveedor_compra INTEGER;
    v_acepta BOOLEAN;
    v_proveedor_devolucion INTEGER;
BEGIN
    SELECT id_proveedor INTO v_proveedor_compra
    FROM compra
    WHERE id_compra = NEW.id_compra;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La compra % no existe.', NEW.id_compra;
    END IF;

    SELECT acepta_devoluciones INTO v_acepta
    FROM proveedor
    WHERE id_proveedor = v_proveedor_compra;

    IF v_acepta IS NOT TRUE THEN
        RAISE EXCEPTION 'El proveedor % no acepta devoluciones.', v_proveedor_compra;
    END IF;

    IF NEW.id_proveedor <> v_proveedor_compra THEN
        RAISE EXCEPTION 'El proveedor de la devolución no coincide con el proveedor de la compra.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_devolucion_proveedor
BEFORE INSERT OR UPDATE ON devolucion_proveedor
FOR EACH ROW
EXECUTE FUNCTION fn_validar_devolucion_proveedor();

CREATE OR REPLACE FUNCTION fn_validar_detalle_devolucion_proveedor()
RETURNS TRIGGER AS $$
DECLARE
    v_compra INTEGER;
    v_lote INTEGER;
    v_stock INTEGER;
    v_devuelto INTEGER;
BEGIN
    SELECT id_compra, id_lote INTO v_compra, v_lote
    FROM detalle_compra
    WHERE id_detalle_compra = NEW.id_detalle_compra;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El detalle de compra % no existe.', NEW.id_detalle_compra;
    END IF;

    IF v_compra <> (SELECT id_compra FROM devolucion_proveedor WHERE id_devolucion_proveedor = NEW.id_devolucion_proveedor) THEN
        RAISE EXCEPTION 'El detalle de compra no pertenece a la compra de la devolución.';
    END IF;

    SELECT COALESCE(SUM(i.cantidad_actual),0) INTO v_stock
    FROM inventario i
    WHERE i.id_lote = v_lote;

    SELECT COALESCE(SUM(ddp.cantidad),0) INTO v_devuelto
    FROM detalle_devolucion_proveedor ddp
    JOIN devolucion_proveedor dp
      ON dp.id_devolucion_proveedor = ddp.id_devolucion_proveedor
    WHERE ddp.id_detalle_compra = NEW.id_detalle_compra
      AND dp.estado IN ('solicitada','aprobada','completada')
      AND ddp.id_detalle_devolucion_proveedor <> COALESCE(NEW.id_detalle_devolucion_proveedor,0);

    IF NEW.cantidad > v_stock THEN
        RAISE EXCEPTION 'No existe stock suficiente para devolver. Stock disponible: %, solicitado: %.', v_stock, NEW.cantidad;
    END IF;

    IF v_devuelto + NEW.cantidad > (SELECT cantidad FROM detalle_compra WHERE id_detalle_compra = NEW.id_detalle_compra) THEN
        RAISE EXCEPTION 'La cantidad total devuelta supera la cantidad comprada.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_detalle_devolucion_proveedor
BEFORE INSERT OR UPDATE ON detalle_devolucion_proveedor
FOR EACH ROW
EXECUTE FUNCTION fn_validar_detalle_devolucion_proveedor();

-- --------------------------------------------------------------------------
-- Completar devolución a proveedor genera salida de inventario.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_procesar_devolucion_proveedor()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
    v_inv INTEGER;
    v_empleado INTEGER;
BEGIN
    IF NEW.estado <> 'completada' OR (TG_OP = 'UPDATE' AND OLD.estado = 'completada') THEN
        RETURN NEW;
    END IF;

    v_empleado := NEW.id_empleado;

    FOR r IN
        SELECT ddp.id_detalle_compra, dc.id_lote, ddp.cantidad
        FROM detalle_devolucion_proveedor ddp
        JOIN detalle_compra dc
          ON dc.id_detalle_compra = ddp.id_detalle_compra
        WHERE ddp.id_devolucion_proveedor = NEW.id_devolucion_proveedor
    LOOP
        SELECT i.id_inventario INTO v_inv
        FROM inventario i
        JOIN ubicacion_inventario u ON u.id_ubicacion=i.id_ubicacion AND u.activa=TRUE
        WHERE i.id_lote = r.id_lote AND i.cantidad_actual >= r.cantidad
        ORDER BY i.id_inventario
        LIMIT 1
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No hay stock suficiente para completar la devolución del lote %.', r.id_lote;
        END IF;

        INSERT INTO movimiento_inventario
        (id_inventario,tipo_movimiento,cantidad,motivo,id_empleado)
        VALUES
        (v_inv,'salida',r.cantidad,
         'Devolución a proveedor - devolución ID: '||NEW.id_devolucion_proveedor,
         v_empleado);
    END LOOP;

    UPDATE lote_medicamento l
    SET estado = CASE WHEN COALESCE((SELECT SUM(i.cantidad_actual) FROM inventario i WHERE i.id_lote=l.id_lote),0)=0 THEN 'devuelto' ELSE l.estado END
    WHERE l.id_lote IN (
        SELECT dc.id_lote
        FROM detalle_devolucion_proveedor ddp
        JOIN detalle_compra dc ON dc.id_detalle_compra=ddp.id_detalle_compra
        WHERE ddp.id_devolucion_proveedor=NEW.id_devolucion_proveedor
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_procesar_devolucion_proveedor
AFTER UPDATE OF estado ON devolucion_proveedor
FOR EACH ROW
EXECUTE FUNCTION fn_procesar_devolucion_proveedor();

-- --------------------------------------------------------------------------
-- Devolución de cliente: valida cantidad y devuelve stock al inventario.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_detalle_devolucion_cliente()
RETURNS TRIGGER AS $$
DECLARE
    v_cantidad_vendida INTEGER;
    v_devuelto INTEGER;
BEGIN
    SELECT cantidad INTO v_cantidad_vendida
    FROM detalle_venta
    WHERE id_detalle_venta = NEW.id_detalle_venta;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El detalle de venta % no existe.', NEW.id_detalle_venta;
    END IF;

    SELECT COALESCE(SUM(cantidad),0) INTO v_devuelto
    FROM detalle_devolucion dd
    WHERE dd.id_detalle_venta=NEW.id_detalle_venta
      AND dd.id_detalle_devolucion <> COALESCE(NEW.id_detalle_devolucion,0);

    IF v_devuelto + NEW.cantidad > v_cantidad_vendida THEN
        RAISE EXCEPTION 'La cantidad devuelta supera la cantidad vendida.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_detalle_devolucion_cliente
BEFORE INSERT OR UPDATE ON detalle_devolucion
FOR EACH ROW
EXECUTE FUNCTION fn_validar_detalle_devolucion_cliente();

CREATE OR REPLACE FUNCTION fn_procesar_devolucion_cliente()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
    v_inv INTEGER;
BEGIN
    IF NEW.estado <> 'completada' OR (TG_OP='UPDATE' AND OLD.estado='completada') THEN
        RETURN NEW;
    END IF;

    FOR r IN
        SELECT dv.id_lote, dd.cantidad
        FROM detalle_devolucion dd
        JOIN detalle_venta dv ON dv.id_detalle_venta=dd.id_detalle_venta
        WHERE dd.id_devolucion=NEW.id_devolucion
    LOOP
        SELECT i.id_inventario INTO v_inv
        FROM inventario i
        JOIN ubicacion_inventario u ON u.id_ubicacion=i.id_ubicacion AND u.activa=TRUE
        WHERE i.id_lote=r.id_lote
        ORDER BY i.id_inventario
        LIMIT 1
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No existe ubicación activa para devolver el lote %.', r.id_lote;
        END IF;

        INSERT INTO movimiento_inventario
        (id_inventario,tipo_movimiento,cantidad,motivo,id_empleado)
        VALUES
        (v_inv,'devolucion',r.cantidad,
         'Devolución de cliente - devolución ID: '||NEW.id_devolucion,
         NEW.id_empleado);
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_procesar_devolucion_cliente
AFTER UPDATE OF estado ON devolucion
FOR EACH ROW
EXECUTE FUNCTION fn_procesar_devolucion_cliente();

-- Puntos: trigger preparado para cuando se habilite fidelización.
CREATE OR REPLACE FUNCTION fn_aplicar_movimiento_puntos()
RETURNS TRIGGER AS $$
DECLARE
    v_saldo INTEGER;
    v_delta INTEGER;
    v_nuevo_saldo INTEGER;
    v_cliente_membresia INTEGER;
    v_cliente_venta INTEGER;
    v_nivel INTEGER;
BEGIN
    SELECT puntos_acumulados, id_cliente
    INTO v_saldo, v_cliente_membresia
    FROM cliente_membresia
    WHERE id_cliente_membresia = NEW.id_cliente_membresia
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La membresía % no existe.', NEW.id_cliente_membresia;
    END IF;

    IF NEW.id_venta IS NOT NULL THEN
        SELECT id_cliente
        INTO v_cliente_venta
        FROM venta
        WHERE id_venta = NEW.id_venta;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'La venta % no existe.', NEW.id_venta;
        END IF;

        IF v_cliente_venta IS DISTINCT FROM v_cliente_membresia THEN
            RAISE EXCEPTION 'La venta % no pertenece al cliente de la membresía.', NEW.id_venta;
        END IF;
    END IF;

    v_delta := CASE
        WHEN NEW.tipo_movimiento IN ('acumulacion','bonificacion')
            THEN NEW.puntos
        WHEN NEW.tipo_movimiento IN ('canje','vencimiento')
            THEN -NEW.puntos
        ELSE NULL
    END;

    IF v_delta IS NULL THEN
        RAISE EXCEPTION
            'El tipo de movimiento % no está habilitado.',
            NEW.tipo_movimiento;
    END IF;

    v_nuevo_saldo := v_saldo + v_delta;

    IF v_nuevo_saldo < 0 THEN
        RAISE EXCEPTION
            'Saldo de puntos insuficiente. Saldo: %, puntos solicitados: %.',
            v_saldo,
            NEW.puntos;
    END IF;

    SELECT id_nivel
    INTO v_nivel
    FROM nivel_membresia
    WHERE activo = TRUE
      AND puntos_minimos <= v_nuevo_saldo
    ORDER BY puntos_minimos DESC
    LIMIT 1;

    UPDATE cliente_membresia
    SET puntos_acumulados = v_nuevo_saldo,
        id_nivel = COALESCE(v_nivel, id_nivel)
    WHERE id_cliente_membresia = NEW.id_cliente_membresia;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_aplicar_movimiento_puntos
AFTER INSERT ON movimiento_puntos
FOR EACH ROW
EXECUTE FUNCTION fn_aplicar_movimiento_puntos();
-- ============================================================================
-- 33. AJUSTE DE SECUENCIAS
-- ============================================================================
SELECT setval(pg_get_serial_sequence('categoria_medicamento','id_categoria'),
    COALESCE((SELECT MAX(id_categoria) FROM categoria_medicamento), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('principio_activo','id_principio_activo'),
    COALESCE((SELECT MAX(id_principio_activo) FROM principio_activo), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('medicamento','id_medicamento'),
    COALESCE((SELECT MAX(id_medicamento) FROM medicamento), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('proveedor','id_proveedor'),
    COALESCE((SELECT MAX(id_proveedor) FROM proveedor), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('persona','id_persona'),
    COALESCE((SELECT MAX(id_persona) FROM persona), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('cliente','id_cliente'),
    COALESCE((SELECT MAX(id_cliente) FROM cliente), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('alergia','id_alergia'),
    COALESCE((SELECT MAX(id_alergia) FROM alergia), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('empleado','id_empleado'),
    COALESCE((SELECT MAX(id_empleado) FROM empleado), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('repartidor','id_repartidor'),
    COALESCE((SELECT MAX(id_repartidor) FROM repartidor), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('sucursal','id_sucursal'),
    COALESCE((SELECT MAX(id_sucursal) FROM sucursal), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('ubicacion_inventario','id_ubicacion'),
    COALESCE((SELECT MAX(id_ubicacion) FROM ubicacion_inventario), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('lote_medicamento','id_lote'),
    COALESCE((SELECT MAX(id_lote) FROM lote_medicamento), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('inventario','id_inventario'),
    COALESCE((SELECT MAX(id_inventario) FROM inventario), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('movimiento_inventario','id_movimiento'),
    COALESCE((SELECT MAX(id_movimiento) FROM movimiento_inventario), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('compra','id_compra'),
    COALESCE((SELECT MAX(id_compra) FROM compra), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('detalle_compra','id_detalle_compra'),
    COALESCE((SELECT MAX(id_detalle_compra) FROM detalle_compra), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('receta_medica','id_receta'),
    COALESCE((SELECT MAX(id_receta) FROM receta_medica), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('detalle_receta','id_detalle_receta'),
    COALESCE((SELECT MAX(id_detalle_receta) FROM detalle_receta), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('seguimiento_tratamiento','id_seguimiento'),
    COALESCE((SELECT MAX(id_seguimiento) FROM seguimiento_tratamiento), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('seguimiento_cliente','id_seguimiento_cliente'),
    COALESCE((SELECT MAX(id_seguimiento_cliente) FROM seguimiento_cliente), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('reaccion_adversa','id_reaccion'),
    COALESCE((SELECT MAX(id_reaccion) FROM reaccion_adversa), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('metodo_pago','id_metodo_pago'),
    COALESCE((SELECT MAX(id_metodo_pago) FROM metodo_pago), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('venta','id_venta'),
    COALESCE((SELECT MAX(id_venta) FROM venta), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('detalle_venta','id_detalle_venta'),
    COALESCE((SELECT MAX(id_detalle_venta) FROM detalle_venta), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('pago','id_pago'),
    COALESCE((SELECT MAX(id_pago) FROM pago), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('pedido','id_pedido'),
    COALESCE((SELECT MAX(id_pedido) FROM pedido), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('detalle_pedido','id_detalle_pedido'),
    COALESCE((SELECT MAX(id_detalle_pedido) FROM detalle_pedido), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('seguimiento_pedido','id_seguimiento'),
    COALESCE((SELECT MAX(id_seguimiento) FROM seguimiento_pedido), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('direccion','id_direccion'),
    COALESCE((SELECT MAX(id_direccion) FROM direccion), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('delivery','id_delivery'),
    COALESCE((SELECT MAX(id_delivery) FROM delivery), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('nivel_membresia','id_nivel'),
    COALESCE((SELECT MAX(id_nivel) FROM nivel_membresia), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('cliente_membresia','id_cliente_membresia'),
    COALESCE((SELECT MAX(id_cliente_membresia) FROM cliente_membresia), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('movimiento_puntos','id_movimiento_puntos'),
    COALESCE((SELECT MAX(id_movimiento_puntos) FROM movimiento_puntos), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('oferta','id_oferta'),
    COALESCE((SELECT MAX(id_oferta) FROM oferta), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('descuento_membresia','id_descuento_membresia'),
    COALESCE((SELECT MAX(id_descuento_membresia) FROM descuento_membresia), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('devolucion','id_devolucion'),
    COALESCE((SELECT MAX(id_devolucion) FROM devolucion), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('detalle_devolucion','id_detalle_devolucion'),
    COALESCE((SELECT MAX(id_detalle_devolucion) FROM detalle_devolucion), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('devolucion_proveedor','id_devolucion_proveedor'),
    COALESCE((SELECT MAX(id_devolucion_proveedor) FROM devolucion_proveedor), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('detalle_devolucion_proveedor','id_detalle_devolucion_proveedor'),
    COALESCE((SELECT MAX(id_detalle_devolucion_proveedor) FROM detalle_devolucion_proveedor), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('usuario','id_usuario'),
    COALESCE((SELECT MAX(id_usuario) FROM usuario), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('rol','id_rol'),
    COALESCE((SELECT MAX(id_rol) FROM rol), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('permiso','id_permiso'),
    COALESCE((SELECT MAX(id_permiso) FROM permiso), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('modulo_sistema','id_modulo'),
    COALESCE((SELECT MAX(id_modulo) FROM modulo_sistema), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('transferencia_sucursal','id_transferencia'),
    COALESCE((SELECT MAX(id_transferencia) FROM transferencia_sucursal), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('detalle_transferencia','id_detalle_transferencia'),
    COALESCE((SELECT MAX(id_detalle_transferencia) FROM detalle_transferencia), 0) + 1, false);

COMMIT;