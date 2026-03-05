import { IsIn, IsString } from 'class-validator';
import { DOCUMENT_TYPES, DocumentTypeValue } from '../constants/document-type.constants';

export class UpdateDocumentTypeDto {
  @IsString()
  @IsIn(DOCUMENT_TYPES)
  documentType!: DocumentTypeValue;
}
