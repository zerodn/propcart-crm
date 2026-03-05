import { IsIn, IsOptional, IsString } from 'class-validator';
import { DOCUMENT_TYPES, DocumentTypeValue } from '../constants/document-type.constants';

export class ListDocumentsDto {
  @IsOptional()
  @IsString()
  @IsIn(DOCUMENT_TYPES)
  documentType?: DocumentTypeValue;
}
