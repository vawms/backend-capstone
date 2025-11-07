import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsPhoneNumber,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceRequestType } from '../../../entities/service-request.entity';

/**
 * Media object in request body
 * { url: "https://...", kind: "image" }
 */
class MediaItemDto {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsEnum(['image', 'video', 'document'])
  kind!: 'image' | 'video' | 'document';
}

/**
 * Contact information from the form
 */
class ContactDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsPhoneNumber() // Validates international phone format
  @IsNotEmpty()
  phone!: string;
}

/**
 * Main intake request DTO
 */
export class CreateIntakeRequestDto {
  @IsEnum(ServiceRequestType)
  @IsNotEmpty()
  type!: ServiceRequestType;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @ValidateNested()
  @Type(() => ContactDto)
  contact!: ContactDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10) // Max 10 media items
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  media?: MediaItemDto[];
}
