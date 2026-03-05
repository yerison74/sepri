import React from 'react';
import {
  CheckCircle,
  Warning,
  Info,
  TableChart
} from '@mui/icons-material';

const UploadInstructions: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-xl font-semibold mb-4">
        📋 Instrucciones para Cargar Datos
      </h3>
      
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4">
        <p className="text-sm">
          <strong>Formato recomendado:</strong> Excel (.xlsx) o CSV para facilitar la edición
        </p>
      </div>

      <h4 className="text-lg font-medium mb-3">
        📊 Estructura de la Plantilla
      </h4>
      
      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-3">
          <TableChart className="text-[#42A5F5] mt-1" />
          <div>
            <div className="font-medium text-sm">Columnas requeridas:</div>
            <div className="text-sm text-gray-600">
              codigo, contrato, tipo_obra, nombre, estado, fecha_inicio, fecha_fin_estimada, responsable, descripcion
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-500 mt-1" />
          <div>
            <div className="font-medium text-sm">Estados válidos recomendados:</div>
            <div className="text-sm text-gray-600">
              ACTIVA, INAUGURADA, TERMINADA, DETENIDA, PRELIMINARES, INTERVENIDA MANTENIMIENTO, NO ESPECIFICADO
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Info className="text-blue-500 mt-1" />
          <div>
            <div className="font-medium text-sm">Formato de fechas:</div>
            <div className="text-sm text-gray-600">YYYY-MM-DD (ejemplo: 2024-01-15)</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Info className="text-blue-500 mt-1" />
          <div>
            <div className="font-medium text-sm">Valores para tipo_obra:</div>
            <div className="text-sm text-gray-600">Construccion, Mantenimiento</div>
          </div>
        </div>
      </div>

      <hr className="my-4 border-gray-200" />

      <h4 className="text-lg font-medium mb-3">
        🔧 Pasos para Usar la Plantilla
      </h4>
      
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-500 mt-1" />
          <div>
            <div className="font-medium text-sm">1. Descargar plantilla</div>
            <div className="text-sm text-gray-600">Haz clic en 'Descargar Plantilla Excel/CSV'</div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-500 mt-1" />
          <div>
            <div className="font-medium text-sm">2. Editar en Excel</div>
            <div className="text-sm text-gray-600">Abre el archivo en Excel y modifica los datos según tus necesidades</div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-500 mt-1" />
          <div>
            <div className="font-medium text-sm">3. Guardar como CSV</div>
            <div className="text-sm text-gray-600">Guarda el archivo como CSV (.csv) para subirlo al sistema</div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-500 mt-1" />
          <div>
            <div className="font-medium text-sm">4. Subir archivo</div>
            <div className="text-sm text-gray-600">Arrastra el archivo CSV al área de carga o haz clic para seleccionarlo</div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mt-4">
        <p className="text-sm">
          <strong>Importante:</strong> Asegúrate de que los códigos de obra sean únicos. 
          Si un código ya existe, se actualizará la obra existente.
        </p>
      </div>
    </div>
  );
};

export default UploadInstructions;
