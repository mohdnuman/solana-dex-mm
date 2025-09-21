import taskTypeEnum from "../enum/task.type.enum";
import taskSchemas from "../schema/task.context.schema";

export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

function validateTaskContext(taskType: string, context: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!Object.values(taskTypeEnum).includes(taskType as any)) {
        return {
            valid: false,
            errors: [{field: 'taskType', message: `Invalid task type: ${taskType}`}]
        };
    }

    const schema = taskSchemas[taskType];
    if (!schema) {
        return {
            valid: false,
            errors: [{field: 'taskType', message: `No schema found for task type: ${taskType}`}]
        };
    }

    if (!context || typeof context !== 'object') {
        return {
            valid: false,
            errors: [{field: 'context', message: 'Context must be a valid object'}]
        };
    }

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
        const fieldValue = context[fieldName];
        const fieldErrors = validateField(fieldName, fieldValue, fieldSchema);
        errors.push(...fieldErrors);
    }

    const schemaFields = Object.keys(schema);
    const contextFields = Object.keys(context);
    const extraFields = contextFields.filter(field => !schemaFields.includes(field));

    for (const extraField of extraFields) {
        errors.push({
            field: extraField,
            message: `Unknown field: ${extraField}`,
            value: context[extraField]
        });
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function validateField(fieldName: string, value: any, schema: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (schema.required && (value === undefined || value === null || value === '')) {
        errors.push({
            field: fieldName,
            message: `${fieldName} is required`,
            value
        });
        return errors;
    }

    if (value === undefined || value === null || value === '') {
        return errors;
    }

    if (!validateType(value, schema.type)) {
        errors.push({
            field: fieldName,
            message: `${fieldName} must be of type ${schema.type}`,
            value
        });
        return errors;
    }

    if (schema.type === 'number') {
        if (schema.min !== undefined && value < schema.min) {
            errors.push({
                field: fieldName,
                message: `${fieldName} must be at least ${schema.min}`,
                value
            });
        }
        if (schema.max !== undefined && value > schema.max) {
            errors.push({
                field: fieldName,
                message: `${fieldName} must be at most ${schema.max}`,
                value
            });
        }
    }

    if (schema.type === 'string') {
        if (schema.enum && !schema.enum.includes(value)) {
            errors.push({
                field: fieldName,
                message: `${fieldName} must be one of: ${schema.enum.join(', ')}`,
                value
            });
        }
    }

    return errors;
}

function validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
        case 'string':
            return typeof value === 'string';
        case 'number':
            return typeof value === 'number' && !isNaN(value);
        case 'boolean':
            return typeof value === 'boolean';
        case 'array':
            return Array.isArray(value);
        default:
            return false;
    }
}

function getTaskSchema(taskType: string): any {
    if (!Object.values(taskTypeEnum).includes(taskType as any)) {
        return null;
    }
    return taskSchemas[taskType] || null;
}

export default {
    getTaskSchema:  getTaskSchema,
    validateTaskContext: validateTaskContext,
}
